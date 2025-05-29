import { defineStore } from "pinia";

export const usePreferencesStore = defineStore(
  "preferences",
  () => {
    const selectedPlayer = ref<null | string>(null);
    const enableHeader = ref(true);
    return { enableHeader, selectedPlayer };
  },
  { persist: true },
);
