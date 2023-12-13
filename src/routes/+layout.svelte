<script>
  import { onMount } from "svelte";
  import "../app.css";

  async function detectSWUpdate() {
    const registration = await navigator.serviceWorker.ready;

    registration.addEventListener("updatefound", () => {
      const newSW = registration.installing;
      newSW.addEventListener("statechange", () => {
        if (newSW.state === "installed") {
          if (confirm("New update availabe. Reload?")) {
            newSW.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          }
        }
      });
    });
  }

  onMount(detectSWUpdate);
</script>

<slot />

<svelte:head>
  <title>Video Converter</title>
</svelte:head>
