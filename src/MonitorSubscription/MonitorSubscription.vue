<script setup lang="ts">
import { computed, onMounted, Ref, ref, watch } from "vue";
import { fetchSubscriptions, Monitor } from "../Monitors";
import { SubscriptionLevel } from "./SubscriptionLevel";
import { http } from "../modules"
import type { IMonitorSubscription } from "../types";

const props = defineProps<{ monitor: Monitor}>();
// Dropdown state
const active = ref(false);
// Subscription status
const subscribed = ref(false);
const subscriptionOptions: Ref<HTMLElement> = ref(null!);
const validUser = (window as any).USER?.is_authenticated

const buttonText = computed(() => subscribed.value ? "Manage Subscription" : "Subscribe To Alerts")

// Subscription Levels
let subscriptionLevels = [
  new SubscriptionLevel("unhealthy_sensitive", "#D4712B"),
  new SubscriptionLevel("unhealthy", "#C3281C"),
  new SubscriptionLevel("very_unhealthy", "#66567E"),
  new SubscriptionLevel("hazardous", "#653734")
];

function formatDataStr(data_str: string) {
  if (!data_str) {
    return "";
  }

  return data_str.split("_")
    .map(str => str.charAt(0).toUpperCase() + str.slice(1))
    .join(" ");
}

function hideUnsubscribe(target: HTMLElement, selectedLevel: SubscriptionLevel) {
  if (selectedLevel.subscribed && target.innerText === "Unsubscribe") {
    target.innerText = formatDataStr(selectedLevel.levelName);
    target.style.textAlign = "left";
  }
}

async function loadSubscriptions() {
  let subscription;

  if ("USER" in window && (window as any).USER.is_authenticated) {
    const subscriptions = await fetchSubscriptions();

    if (subscriptions) {
      subscription = subscriptions.find(s => s.monitor === props.monitor.data.id);
    }
  }

  if (subscription) {
    update(subscription.level);

  } else {
    update(null);
  }
}

function selectOption(target: HTMLElement, selectedLevel: SubscriptionLevel) {
  update(selectedLevel.levelName);

  if (target.innerText === "Unsubscribe") {
    unsubscribe(selectedLevel.levelName);
    target.innerText = selectedLevel.display;
    target.style.textAlign = "left";

  } else {
    subscribe(selectedLevel.levelName);
  }

  // close dropdown
  active.value = false;
}

function showUnsubscribe(target: HTMLElement, selectedLevel: SubscriptionLevel) {
  if (selectedLevel.subscribed && target.innerText !== "Unsubscribe") {
    target.style.textAlign = "center";
    target.innerText = "Unsubscribe";
  }
}

function subscribe(level: IMonitorSubscription["level"]) {
  http.post(`monitors/${ props.monitor.data.id }/alerts/subscribe/`, { level })
    .catch(err => console.error("Failed to subscribe", err));
}

function toggleDropdown() {
  active.value = !active.value;
}

function unsubscribe(level: IMonitorSubscription["level"]) {
  http.post(`monitors/${ props.monitor.data.id }/alerts/unsubscribe/`, { level })
    .catch(err => console.error("Failed to unsubscribe", err));
}

function update(level: IMonitorSubscription["level"] | null) {
  subscriptionLevels = subscriptionLevels.map(sub => {
    if (sub.levelName === level) {
      sub.subscribed = !sub.subscribed;

    } else {
      sub.subscribed = false;
    }

    return sub;
  });

  subscribed.value = !subscriptionLevels.every(sub => sub.subscribed === false);
}


watch(
  () => props.monitor,
  async () => {
    if (props.monitor) {
      active.value = false;
      await loadSubscriptions();
    }
  }
);

onMounted(async () => {
  // This is kind of a dirty hack to force keep the initial width of
  // the dropdown options, but it's 2am;
  if (subscriptionOptions.value) {
    const buttonRect = (subscriptionOptions.value.previousSibling! as HTMLElement).getBoundingClientRect();
    subscriptionOptions.value.style.width = `${ buttonRect.width }px`
  }
});
</script>

<template>
  <div v-if="validUser" class="monitor-subscription-wrapper">
    <div class="monitor-subscription-container">

      <button @click="toggleDropdown" :class="[{ 'is-success': subscribed }, 'is-info']"
        class="button is-small monitor-subscription-button">
        {{ buttonText }} <span :class="{ 'rotate': active }" class="material-symbols-outlined">expand_more</span>
      </button>

      <div ref="subscriptionOptions" :class="{ active }" class="monitor-subscription-options">
        <p v-for="(level, index) of subscriptionLevels" :key="index"
          @click="e => selectOption(e.target as HTMLElement, level)"
          @mouseover="e => showUnsubscribe(e.target as HTMLElement, level)"
          @mouseleave="e => hideUnsubscribe(e.target as HTMLElement, level)"
          :style="{ backgroundColor: level.bgColor }"
          :class="{ subscribed: level.subscribed }" class="monitor-subscription-option">
          {{ level.display }}
        </p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.rotate {
  transform: rotate(180deg);
}
.material-symbols-outlined {
  transition: transform .5s;
}
.monitor-subscription-container {
  border-radius: 1em;
}

.monitor-subscription-button {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.monitor-subscription-button i {
  font-size: 1.2em;
  margin-left: .5em;
  transition-duration: 75ms;
}

.monitor-subscription-options {
  height: 0;
  visibility: hidden;
  position: absolute;
  z-index: 1;
}

.monitor-subscription-options.active {
  height: initial;
  visibility: visible;
}

.monitor-subscription-option {
  cursor: pointer;
  color: #FFF;
  font-size: .75rem;
  padding: .5em 1em;
  white-space: nowrap;
}

.monitor-subscription-option:first-of-type {
  border-radius: 2px 2px 0 0;
}

.monitor-subscription-option:last-of-type {
  border-radius: 0 0 2px 2px;
}

.monitor-subscription-option.subscribed {
  border: 4px solid black;
}
</style>

