import App from "@/components/CopyController.vue";
import "@/assets/main.css";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

export interface RoundStats {
  rating20: number;
  averageCombatScore: number;
  kills: number;
  deaths: number;
  assists: number;
  killsDeathsDifferential: number;
  killAssistTradeSurvivePercentage: number;
  averageDamagePerRound: number;
  headshotPercentage: number;
  firstKills: number;
  firstDeaths: number;
  firstKillDifferential: number;
}

export interface PlayerStats {
  playerName: string;
  agent: string;
  bothRoundStats: RoundStats;
  attackingRoundStats: RoundStats;
  defendingRoundStats: RoundStats;
}

export interface Game {
  gameId: string;
  mapName: string;
  available: boolean;
  stats: PlayerStats[] | null;
}

function extractPlayerStats(row: HTMLTableRowElement): PlayerStats | null {
  // Order: player name, agent, R2.0, ACS, K, D, A, +/-, KAST, ADR, HS%, FK, FD, F+/-
  const cells: NodeListOf<HTMLTableCellElement> = row.querySelectorAll("td");
  if (cells.length < 14) {
    console.warn("Not enough cells in row to extract player stats");
    return null;
  }
  const [
    playerNameCell,
    agentCell,
    rating20Cell,
    acsCell,
    killsCell,
    deathsCell,
    assistsCell,
    kddCell,
    kastCell,
    adrCell,
    hsCell,
    firstKillsCell,
    firstDeathsCell,
    firstKillDifferentialCell,
  ] = cells;

  // Each round cell has a span, with three spans inside
  // Each span has .mod-both .mod-t or .mod-ct class depending on round

  const [bothRoundStats, attackingRoundStats, defendingRoundStats] = [
    ".mod-both",
    ".mod-t",
    ".mod-ct",
  ].map(
    (className) =>
      ({
        rating20: parseFloat(
          rating20Cell.querySelector(className)?.textContent!,
        ),
        averageCombatScore: parseInt(
          acsCell.querySelector(className)?.textContent!,
        ),
        kills: parseInt(killsCell.querySelector(className)?.textContent!),
        deaths: parseInt(deathsCell.querySelector(className)?.textContent!),
        assists: parseInt(assistsCell.querySelector(className)?.textContent!),
        killsDeathsDifferential: parseInt(
          kddCell.querySelector(className)?.textContent!,
        ),
        killAssistTradeSurvivePercentage: parseInt(
          kastCell.querySelector(className)?.textContent!.replaceAll("%", "")!,
        ),
        averageDamagePerRound: parseInt(
          adrCell.querySelector(className)?.textContent!,
        ),
        headshotPercentage: parseInt(
          hsCell.querySelector(className)?.textContent!.replaceAll("%", "")!,
        ),
        firstKills: parseInt(
          firstKillsCell.querySelector(className)?.textContent!,
        ),
        firstDeaths: parseInt(
          firstDeathsCell.querySelector(className)?.textContent!,
        ),
        firstKillDifferential: parseInt(
          firstKillDifferentialCell.querySelector(className)?.textContent!,
        ),
      }) satisfies RoundStats,
  );

  return {
    playerName:
      playerNameCell
        .querySelector(".text-of")
        ?.textContent!.replaceAll("\t", "")
        .trim() ?? "",
    agent: agentCell.querySelector("img")?.getAttribute("title") ?? "",
    bothRoundStats,
    attackingRoundStats,
    defendingRoundStats,
  } satisfies PlayerStats;
}

function extractStats(gameId: string): PlayerStats[] {
  const gameElement = document.querySelector(
    `.vm-stats-game[data-game-id="${gameId}"]`,
  );

  if (!gameElement) {
    console.warn(`Game element not found for ID: ${gameId}`);
    return [];
  }

  const playerRows: NodeListOf<HTMLTableRowElement> =
    gameElement.querySelectorAll("tbody > tr");

  // @ts-ignore
  return Array.from(playerRows).map((playerRow) =>
    extractPlayerStats(playerRow),
  );
}

export default defineContentScript({
  matches: ["*://*.vlr.gg/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const darkMode = document
      .querySelector(".js-dark-switch")!
      .classList.contains("mod-active");

    const gamesNav = document.querySelector(".vm-stats-gamesnav")!;
    const gameButtons = gamesNav.querySelectorAll(".vm-stats-gamesnav-item");

    const games = Array.from(gameButtons).map((button) => {
      let mapName = button.textContent?.replaceAll("\t", "").trim()!;
      if (mapName.includes("\n\n")) {
        mapName = mapName.split("\n\n")[1].trim();
      }
      const gameId = button.getAttribute("data-game-id")!;
      const available = button.getAttribute("data-disabled") === "0";

      return {
        gameId,
        mapName: mapName,
        available,
        stats: available ? extractStats(gameId) : null,
      };
    });

    console.log(games);

    const ui = await createShadowRootUi(ctx, {
      name: "example-ui",
      position: "inline",
      append: "after",
      anchor: gamesNav,
      onMount(container) {
        const app = createApp(App, { games, darkMode });
        const pinia = createPinia();
        pinia.use(piniaPluginPersistedstate);

        app.use(pinia);
        app.mount(container);
        return app;
      },
      onRemove: (app) => {
        // Unmount the app when the UI is removed
        app!.unmount();
      },
    });

    // Call mount to add the UI to the DOM
    ui.mount();
  },
});
