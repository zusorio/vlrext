<script setup lang="ts">
import { Game } from "@/entrypoints/content";
import { Toggle, ToggleGroupItem, ToggleGroupRoot } from "reka-ui";
import { usePreferencesStore } from "@/stores/preferences";
import { storeToRefs } from "pinia";

const props = defineProps<{ games: Game[]; darkMode: boolean }>();

const preferencesStore = usePreferencesStore();
const { selectedPlayer, enableHeader } = storeToRefs(preferencesStore);

const allPlayers = computed(() => {
  return Array.from(
    new Set(
      props.games
        .filter((g) => g.available)
        .flatMap((g) => g.stats!.flatMap((s) => s.playerName)),
    ),
  );
});

const validSelectedPlayer = computed(() => {
  return allPlayers.value.includes(selectedPlayer.value!);
});

const completedGames = computed(() => {
  return props.games.filter((g) => g.available && g.mapName !== "All Maps");
});

const justCopied = ref(false);

function copyGames(games: Game[]) {
  if (!validSelectedPlayer.value) {
    console.warn("No valid player selected");
    return;
  }
  let textToCopy = "";

  if (enableHeader.value) {
    textToCopy +=
      "Player\tAgent\tRating 20\tACS\tKills\tDeaths\tK/D\tAssists\tAvg Damage/Round\tHeadshot %\tFirst Kills\tFirst Deaths\tKAST\tRounds\n";
  }

  for (const game of games) {
    console.log(game);
    const targetStats = game.stats?.find(
      (s) => s.playerName === selectedPlayer.value,
    );

    if (!targetStats) {
      console.warn("No stats found for selected player");
      return;
    }

    const elements = [
      targetStats.playerName,
      targetStats.agent,
      targetStats.bothRoundStats.rating20,
      targetStats.bothRoundStats.averageCombatScore,
      targetStats.bothRoundStats.kills,
      targetStats.bothRoundStats.deaths,
      targetStats.bothRoundStats.killsDeathsDifferential,
      targetStats.bothRoundStats.assists,
      targetStats.bothRoundStats.averageDamagePerRound,
      targetStats.bothRoundStats.headshotPercentage,
      targetStats.bothRoundStats.firstKills,
      targetStats.bothRoundStats.firstDeaths,
      targetStats.bothRoundStats.killAssistTradeSurvivePercentage,
      game.score!.team1 + game.score!.team2, // Total rounds played
    ];

    textToCopy += elements.join("\t") + "\n";
  }

  navigator.clipboard.writeText(textToCopy);
  justCopied.value = true;
  setTimeout(() => {
    justCopied.value = false;
  }, 2000);
}
</script>

<template>
  <div class="font-sans p-2 space-y-2" :class="{ dark: darkMode }">
    <div class="font-bold dark:text-white">Select Player</div>
    <ToggleGroupRoot
      type="single"
      class="flex flex-wrap gap-2"
      v-model="selectedPlayer"
    >
      <ToggleGroupItem
        class="p-2 bg-gray-300 hover:bg-gray-400 data-[state=on]:bg-gray-600 data-[state=on]:text-white cursor-pointer rounded"
        :value="player"
        v-for="player in allPlayers"
      >
        {{ player }}
      </ToggleGroupItem>
    </ToggleGroupRoot>

    <div class="font-bold dark:text-white">
      {{ justCopied ? "Copied Stats!" : "Copy Stats" }}
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        :disabled="!validSelectedPlayer"
        class="p-2 bg-gray-300 disabled:opacity-50 hover:bg-gray-400 cursor-pointer rounded"
        @click="copyGames(games.filter((g) => g.mapName === 'All Maps')!)"
      >
        Combined All Maps
      </button>
      <button
        :disabled="!validSelectedPlayer"
        class="p-2 bg-gray-300 disabled:opacity-50 hover:bg-gray-400 cursor-pointer rounded"
        @click="
          copyGames(
            games.filter((g) => g.mapName !== 'All Maps' && g.available)!,
          )
        "
      >
        Individual All Maps
      </button>
      <button
        :disabled="!validSelectedPlayer"
        class="p-2 bg-gray-300 disabled:opacity-50 hover:bg-gray-400 cursor-pointer rounded"
        v-for="game in completedGames"
        @click="copyGames([game])"
      >
        {{ game.mapName }}
      </button>
    </div>

    <Toggle
      class="p-2 bg-red-500 text-white data-[state=on]:bg-green-600 cursor-pointer rounded"
      v-model="enableHeader"
    >
      {{ enableHeader ? "Include Header" : "Exclude Header" }}
    </Toggle>
  </div>
</template>
