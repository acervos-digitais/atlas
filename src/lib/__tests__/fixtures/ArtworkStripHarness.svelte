<script>
  import ArtworkStrip from '../../../components/ArtworkStrip.svelte';

  export let artworks = [];
  export let locale = 'pt';
  export let mobile = false;
  export let selectedCreator = null;
  export let onArtistSelect = null;
  let collapsed = false;

  export function configure(next) {
    if ('artworks' in next) artworks = next.artworks;
    if ('locale' in next) locale = next.locale;
    if ('mobile' in next) mobile = next.mobile;
    if ('selectedCreator' in next) selectedCreator = next.selectedCreator;
  }
</script>

<ArtworkStrip
  {artworks}
  {locale}
  {mobile}
  {selectedCreator}
  {onArtistSelect}
  bind:collapsed
/>
