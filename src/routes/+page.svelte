<script>
  import { confetti } from "@neoconfetti/svelte";
  import { fade } from "svelte/transition";
  import { tweened } from "svelte/motion";
  import { FFmpeg } from "@ffmpeg/ffmpeg";
  import { onMount } from "svelte";

  const states = {
    loaded: 0,
    converting: 1,
    error: 3,
    done: 2,
  };

  let error = "";
  let ffmpeg = null;
	let startedTime = 0;
	let estimatedTime = "";
  let progress = tweened(0);
  let state = states.loading;

  async function readFile(file) {
    const reader = new FileReader();
    const data = await new Promise((resolve, reject) => {
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer)
          resolve(new Uint8Array(reader.result));
      };

      reader.onerror = (err) => {
        error = "Error reading file";
        state = states.error;
        reject(err);
      };

      reader.readAsArrayBuffer(file);
    });
    return data;
  }

  async function convertVideo(video) {
    state = states.converting;

    const file = await readFile(video);

    await ffmpeg.writeFile("video.webm", file);

		startedTime = Date.now();
    await ffmpeg.exec(["-i", "video.webm", "video.mp4"]);
    const data = await ffmpeg.readFile("video.mp4");

    state = states.done;
    setTimeout(() => (state = states.loaded), 3000);

    return data;
  }

  function downloadVideo(data, name = "video.mp4") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([data.buffer], { type: "video/mp4" })
    );
    a.download = name;

    setTimeout(() => {
      a.click();
    }, 1000);
  }

  async function handleDrop({ dataTransfer: { files } }) {
    if (state !== states.loaded) return (error = "Operation in progress");
    if (files.length > 1) return (error = "Upload one file at a time");
    const file = files[0];

    if (file.type !== "video/webm")
      return (error = "Only WebM files are supported");
    error = null;

    const name = file.name.split('.').slice(0, -1).join('.') + '.mp4';
    const data = await convertVideo(file);
    downloadVideo(data, name);
  }

  function handleClick() {
    const input = document.createElement("input");
    input.accept = "video/webm";
    input.type = "file";

    input.onchange = (e) => {
      const files = e.target.files;
      handleDrop({ dataTransfer: { files } });
    };

    input.click();
  }

	function updateEstimatedTime(progressValue) {
		if (progressValue <= 0) {
			estimatedTime = "Estimating time...";
		} else {
			const passedTime = Date.now() - startedTime;
			const estimatedTotalTime = passedTime / (progressValue / 100);
			const estimatedTimeLeft = estimatedTotalTime - passedTime;
			const minutes = Math.floor(estimatedTimeLeft / 60000);
			const seconds = Math.floor((estimatedTimeLeft % 60000) / 1000);
			estimatedTime = `${minutes} minute(s) and ${seconds} second(s) remaining`;
		}
	}

  async function loadFFmpeg() {
    ffmpeg = new FFmpeg();
    ffmpeg.on("progress", (e) => {
			const progressValue = e.progress * 100
			$progress = progressValue;

			updateEstimatedTime(progressValue);
		});

		await ffmpeg.load({
			coreURL: "/ffmpeg/core.js",
			wasmURL: "/ffmpeg/core.wasm",
			workerURL: "/ffmpeg/worker.js"
		});

    state = states.loaded;
  }

  onMount(loadFFmpeg);
</script>

<h1 class="title">WebM to MP4 Converter</h1>

<div
  on:drop|preventDefault={handleDrop}
  on:dragover|preventDefault={() => {}}
  on:click={handleClick}
  data-state={state}
  class="drop"
>
  {#if state === states.loaded}
    <p in:fade>Drag video here</p>
  {:else if state === states.converting}
    <p in:fade>Converting video</p>
    <div class="progress-bar">
      <div class="progress" style:--progress="{$progress}%">
        {$progress.toFixed(0)}%
      </div>
    </div>
		<span in:fade>{estimatedTime}</span>
  {:else if state === states.done}
    <div use:confetti />
    <p in:fade>Done! 🎉</p>
  {:else}
    <p in:fade>Loading FFmpeg...</p>
  {/if}
  {#if error}
    <p in:fade class="error">{error}</p>
  {/if}
</div>

<style>
  .title {
    text-align: center;
  }

  .drop {
    width: 500px;
    height: 350px;
    display: grid;
    place-content: center;
    margin-block-start: 2rem;
    border: 10px dashed hsl(220 10% 20%);
    border-radius: 8px;

    & p {
      font-size: 2rem;
      text-align: center;

      &.error {
        color: hsl(9 100% 64%);
      }
    }
  }

  .progress-bar {
    --progress-bar-clr: hsl(180 100% 50%);
    --progress-txt-clr: hsl(0 0% 0%);

    width: 300px;
    height: 40px;
    position: relative;
    font-weight: 700;
    background-color: hsl(200, 10% 14%);
    border-radius: 8px;

    & div.progress {
      width: var(--progress);
      height: 100%;
      position: absolute;
      left: 0px;
      display: grid;
      place-content: center;
      background: var(--progress-bar-clr);
      color: var(--progress-txt-clr);
      border-radius: 8px;
    }
  }
</style>
