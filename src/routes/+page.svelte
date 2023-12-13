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

  let state = states.loading;
  let error = "";
  let ffmpeg = null;
  let progress = tweened(0);

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

    await ffmpeg.writeFile("file.webm", file);
    await ffmpeg.exec(["-i", "file.webm", "output.mp4"]);
    const data = await ffmpeg.readFile("output.mp4");

    state = states.done;
    setTimeout(() => state = states.loaded, 3000);
    
    return data;
  }

  function downloadVideo(data) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([data.buffer], { type: "video/mp4" })
    );
    a.download = "video.mp4";

    setTimeout(() => {
      a.click();
    }, 1000);
  }

  async function handleDrop({ dataTransfer: { files } }) {
    if (files.length > 1) return (error = "Upload one file at a time");
    const file = files[0];

    if (file.type !== "video/webm")
      return (error = "Only WebM files are supported");
    error = null;

    const data = await convertVideo(file);
    downloadVideo(data);
  }

  function handleClick() {
    const input = document.createElement('input');
    input.accept = "video/webm";
    input.type = 'file';

    input.onchange = e => { 
      const files = e.target.files;
      handleDrop({ dataTransfer: { files } })
    }

    input.click();
  }

  async function loadFFmpeg() {
    ffmpeg = new FFmpeg();
    ffmpeg.on("progress", (e) => $progress = e.progress * 100)

    await ffmpeg.load({
      coreURL: '/ffmpeg/core.js',
      wasmURL: '/ffmpeg/core.wasm',
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
