<script lang="ts">
	import { onMount } from 'svelte';

	onMount(async () => {
		const { SocketConnection } = await import('$lib/socket');
		const app = new SocketConnection('ws://127.0.0.1:3200');
		console.log('object');
	});
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
