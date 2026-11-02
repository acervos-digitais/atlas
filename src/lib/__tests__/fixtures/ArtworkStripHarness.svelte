<script>
  import ArtworkStrip from '../../../components/ArtworkStrip.svelte';
  import ProfilePanel from '../../../components/ProfilePanel.svelte';
  import { ARTWORK_STRIP_HEIGHT_COLLAPSED, ARTWORK_STRIP_HEIGHT_MOBILE_COLLAPSED } from '../../constants.js';

  export let artworks = [];
  export let locale = 'pt';
  export let mobile = false;
  export let selectedCreator = null;
  export let onArtistSelect = null;
  export let showProfile = false;
  let collapsed = false;
  let renderedHeight = 0;

  export function height() {
    return renderedHeight;
  }

  export function configure(next) {
    if ('artworks' in next) artworks = next.artworks;
    if ('locale' in next) locale = next.locale;
    if ('mobile' in next) mobile = next.mobile;
    if ('selectedCreator' in next) selectedCreator = next.selectedCreator;
    if ('collapsed' in next) collapsed = next.collapsed;
    if ('showProfile' in next) showProfile = next.showProfile;
  }
</script>

{#if showProfile}
  <ProfilePanel
    {locale}
    breakpoint={mobile ? 'mobile' : 'desktop'}
    artworkStripInset={Math.max(0, renderedHeight - (mobile ? ARTWORK_STRIP_HEIGHT_MOBILE_COLLAPSED : ARTWORK_STRIP_HEIGHT_COLLAPSED))}
  />
{/if}

<ArtworkStrip
  {artworks}
  {locale}
  {mobile}
  {selectedCreator}
  {onArtistSelect}
  bind:collapsed
  bind:renderedHeight
/>
