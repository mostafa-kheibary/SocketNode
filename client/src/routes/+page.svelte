<script lang="ts">
	import type { SocketConnection } from '$lib/Socket';
	import { onMount } from 'svelte';

	let app: SocketConnection;
	const getToken = async () => {
		return new Promise((res) => {
			setTimeout(() => {
				res('hello');
			}, 100);
		});
	};
	onMount(async () => {
		const { SocketConnection } = await import('$lib/Socket');

		app = new SocketConnection('ws://localhost:3200', {
			apiKey: 'hwjnefjwnef',
			token: getToken
		});
		app.on('connection', ({ data }) => {
			console.log(data);
		});
		app.on<string>('hi', (data) => {
			console.log(data);
		});
	});
	const handleClick = () => {
		app.send('/public/test');
	};
</script>

<button on:click={handleClick}>click</button>
<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
