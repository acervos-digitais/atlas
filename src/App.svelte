<script>
  import { onMount } from 'svelte';
  import WorldMap from './components/WorldMap.svelte';
  import Header from './components/Header.svelte';
  import MobileHeader from './components/MobileHeader.svelte';
  import FilterAccordion from './components/FilterAccordion.svelte';
  import SidebarFilters from './components/SidebarFilters.svelte';
  import ProjectionToggle from './components/ProjectionToggle.svelte';
  import ZoomButtons from './components/ZoomButtons.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import ArtistCard from './components/ArtistCard.svelte';
  import ArtworkStrip from './components/ArtworkStrip.svelte';
  import MapStats from './components/MapStats.svelte';
  import ProfilePanel from './components/ProfilePanel.svelte';
  import TutorialBox from './components/TutorialBox.svelte';
  import AboutModal from './components/AboutModal.svelte';
  import ThemeToggle from './components/ThemeToggle.svelte';

  let measuredHeaderHeight = 0;
  let measuredMenuHeight = 0;

  function measureChrome(node, menus = false) {
    const targets = menus ? [...node.querySelectorAll('.accordion-header')] : [node];
    const update = () => {
      const borderHeight = (element) => {
        const style = getComputedStyle(element);
        return parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      };
      const height = targets.reduce((sum, target) =>
        sum + target.getBoundingClientRect().height + (menus ? borderHeight(target.parentElement) : 0), 0)
        + (menus ? borderHeight(node) : 0);
      if (menus) measuredMenuHeight = height;
      else measuredHeaderHeight = height;
      const root = document.documentElement;
      root.style.setProperty('--mobile-header-height', `${measuredHeaderHeight}px`);
      root.style.setProperty('--menu-height', `${measuredHeaderHeight + measuredMenuHeight}px`);
    };
    const observer = new ResizeObserver(update);
    targets.forEach(target => observer.observe(target));
    update();
    return {
      destroy() {
        observer.disconnect();
        if (menus) measuredMenuHeight = 0;
        else measuredHeaderHeight = 0;
      },
    };
  }
  import { loadData } from './lib/dataUtils.js';
  import { applyFilters, applyTrajectoryFilter, computeAvailableOptions } from './lib/filterModel.js';
import {
  UNDATED_YEAR,
  ARTWORK_STRIP_HEIGHT_EXPANDED,
  ARTWORK_STRIP_HEIGHT_COLLAPSED,
  ARTWORK_STRIP_HEIGHT_MOBILE_EXPANDED,
  ARTWORK_STRIP_HEIGHT_MOBILE_COLLAPSED,
  BREAKPOINT_TABLET,
  ZOOM_STEP_FACTOR,
  getBreakpoint,
  LS_TUTORIAL_KEY,
  LS_THEME_KEY,
  TUTORIAL_MAP_TITLE,
  TUTORIAL_MAP_TEXT_NAV,
  TUTORIAL_MAP_TEXT_ZOOM,
  TUTORIAL_MAP_TEXT_MOBILE_SELECT,
  TUTORIAL_MAP_TEXT_MOBILE_NAV,
  TUTORIAL_MAP_TEXT_MOBILE_ZOOM,
  TUTORIAL_MAP_TEXT_2D,
  TUTORIAL_NAV_LABELS,
  SECTION_LABELS,
  CSV_CREATORS_PATH_PT,
  CSV_CREATORS_PATH_EN,
  getLocalidadesList,
  getLocalidadesReverseMap,
} from './lib/constants.js';

  /** Níveis do FilterAccordion no mobile (ordem + rótulos). */
  $: ACCORDION_ITEMS = [
    { id: 'level1', label: SECTION_LABELS[locale].accordion },
    { id: 'level2', label: SECTION_LABELS[locale].visualizationsAndFilters },
  ];

  const LS_STRIP_KEY = 'meta-acervo:artwork-strip-collapsed';

  /** Detecta o locale a partir do query string `?lang=en` (fallback: 'pt'). */
  function readLocaleFromUrl() {
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const lang = params.get('lang');
      return lang === 'en' ? 'en' : 'pt';
    } catch {
      return 'pt';
    }
  }

  /** Lê preferência de tema do localStorage (fallback 'dark'). */
  function readTheme() {
    try {
      const v = localStorage.getItem(LS_THEME_KEY);
      return v === 'light' ? 'light' : 'dark';
    } catch { return 'dark'; }
  }

  /** Persiste preferência de tema sem lançar exceção. */
  function saveTheme(val) {
    try { localStorage.setItem(LS_THEME_KEY, val); } catch { /* silencioso */ }
  }

  let theme = readTheme();
  $: saveTheme(theme);
  $: if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  /** Locale detectado da URL (`?lang=en`) — padrão: 'pt'. */
  let locale = readLocaleFromUrl();

  /** Caminho do CSV derivado do locale. */
  $: csvPath = locale === 'en' ? CSV_CREATORS_PATH_EN : CSV_CREATORS_PATH_PT;

  /** Lê estado collapsed do localStorage (fallback false). */
  function readCollapsed() {
    try { return localStorage.getItem(LS_STRIP_KEY) === 'true'; } catch { return false; }
  }

  /** Persiste estado collapsed sem lançar exceção (quota / modo privado). */
  function saveCollapsed(val) {
    try { localStorage.setItem(LS_STRIP_KEY, String(val)); } catch { /* silencioso */ }
  }

  // ── Tutorial / Onboarding ─────────────────────────────────────────────────────

  let tutorialDismissed = (() => {
    try { return localStorage.getItem(LS_TUTORIAL_KEY) === 'true'; } catch { return false; }
  })();

  function handleTutorialDismiss() {
    tutorialDismissed = true;
    try { localStorage.setItem(LS_TUTORIAL_KEY, 'true'); } catch { /* silencioso */ }
  }

  function handleTutorialReopen() {
    tutorialDismissed = false;
    try { localStorage.removeItem(LS_TUTORIAL_KEY); } catch { /* silencioso */ }
  }

  let bubbles = [];
  let trajectories = [];
  let acervoBubbles = [];
  let artworksByCreator = new Map();
  let selectedArtist = null;
  let worldMapRef = null;  // Referência ao componente WorldMap para zoom programático
  let activeTypes = new Set(['birth', 'education']);
  let projectionType = '3d';
  let activeAcervos = new Set();
  let allAcervos = [];
  let allGenders = [];
  let activeGenders = new Set();
  let selectedCreators = new Set();
  let selectedSchools = new Set();
  let selectedNationalities = new Set();
  /** Localidade ativa (nome de país OU de continente). `''` = sem filtro. */
  let selectedLocalidade = '';
  /** Visibilidade das trajetórias (linhas conectando bubbles do mesmo criador). */
  let showTrajectories = true;
  let allCreators = [];
  let allSchools = [];
  let allNationalities = [];
  let loading = true;
  let error = null;

  // Estado da sidebar: aberta por padrão em tablet/desktop (≥760px), fechada em mobile
  let sidebarOpen = typeof window !== 'undefined' ? window.innerWidth >= BREAKPOINT_TABLET : false;

  /** Largura da viewport (px), sincronizada via `bind:innerWidth`. */
  let viewportWidth = typeof window !== 'undefined' ? window.innerWidth : BREAKPOINT_TABLET;
  /** Faixa de layout atual: 'mobile' | 'tablet' | 'desktop'. */
  $: breakpoint = getBreakpoint(viewportWidth);
  $: isMobile = breakpoint === 'mobile';

  /** Nível do FilterAccordion expandido no mobile (null = ambos colapsados).
   * Reseta a cada carregamento de página; mantém estado ao redimensionar. */
  let accordionExpandedId = null;
  $: accordionOpen = accordionExpandedId !== null;

  /** Estado collapse do ArtworkStrip — controla `bottomInset` do WorldMap.
   * Inicializado do localStorage para persistir entre reloads. */
  let artworkStripCollapsed = readCollapsed();
  let artworkStripHeight = 0;
  $: saveCollapsed(artworkStripCollapsed);
  /** Reserva a altura medida da faixa; usa dimensões do breakpoint antes da montagem. */
  $: stripCollapsedH = isMobile ? ARTWORK_STRIP_HEIGHT_MOBILE_COLLAPSED : ARTWORK_STRIP_HEIGHT_COLLAPSED;
  $: stripExpandedH = isMobile ? ARTWORK_STRIP_HEIGHT_MOBILE_EXPANDED : ARTWORK_STRIP_HEIGHT_EXPANDED;
  $: artworkStripInset = artworksForStrip.length === 0 ? 0 : (artworkStripHeight || (artworkStripCollapsed ? stripCollapsedH : stripExpandedH));

  onMount(async () => {
    try {
      const data = await loadData(csvPath, locale);
      bubbles = data.bubbles;
      trajectories = data.trajectories;
      acervoBubbles = data.acervoBubbles ?? [];
      artworksByCreator = data.artworksByCreator ?? new Map();
      allAcervos = [...new Set(bubbles.flatMap(b => b.acervos).filter(Boolean))].sort();
      activeAcervos = new Set(allAcervos);
      allGenders = [...new Set(bubbles.map(b => b.gender).filter(Boolean))].sort();
      activeGenders = new Set(allGenders);
      allCreators = [...new Set(bubbles.map(b => b.creator).filter(Boolean))].sort();
      allSchools = [...new Set(bubbles.flatMap(b => b.educatedAt))].sort();
      allNationalities = [...new Set(bubbles.map(b => b.nationality).filter(Boolean))].sort();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  });

  /** Atualiza o conjunto de tipos ativos (nascimento/estudo/morte/acervo). */
  function handleFilterChange(nextTypes) {
    activeTypes = nextTypes;
  }

  /** Atualiza a localidade ativa (string vazia limpa o filtro). */
  function handleLocalidadeChange(nextLocalidade) {
    selectedLocalidade = nextLocalidade ?? '';
  }

  /** Alterna visibilidade das trajetórias. */
  function handleTrajectoriesChange(nextValue) {
    showTrajectories = nextValue;
  }

  /** Alterna a projeção entre 2D e 3D. */
  function handleProjectionChange(nextProjection) {
    projectionType = nextProjection;
  }

  /** Alterna o tema claro/escuro. */
  function handleThemeChange(nextTheme) {
    theme = nextTheme;
  }

  /** Aumenta o zoom do mapa (botão +). */
  function handleZoomIn() {
    if (worldMapRef?.zoomBy) {
      worldMapRef.zoomBy(ZOOM_STEP_FACTOR);
    }
  }

  /** Diminui o zoom do mapa (botão -). */
  function handleZoomOut() {
    if (worldMapRef?.zoomBy) {
      worldMapRef.zoomBy(1 / ZOOM_STEP_FACTOR);
    }
  }

  /** Atualiza o conjunto de acervos ativos. */
  function handleAcervoChange(nextSet) {
    activeAcervos = nextSet;
  }

  /** Atualiza o conjunto de gêneros ativos. */
  function handleGenderChange(nextSet) {
    activeGenders = nextSet;
  }

  /** Atualiza o conjunto de criadores selecionados. */
  function handleCreatorsChange(nextSet) {
    selectedCreators = nextSet;
  }

  /** Atualiza o conjunto de escolas selecionadas. */
  function handleSchoolsChange(nextSet) {
    selectedSchools = nextSet;
  }

  /** Atualiza o conjunto de nacionalidades selecionadas. */
  function handleNationalitiesChange(nextSet) {
    selectedNationalities = nextSet;
  }

  /** Alterna a sidebar (mobile). */
  function handleToggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  /** Fecha a sidebar (mobile). */
  function handleCloseSidebar() {
    sidebarOpen = false;
  }

  /** Abre o modal "Sobre / O Atlas". */
  let aboutOpen = false;
  function handleAboutOpen() { aboutOpen = true; }
  function handleAboutClose() { aboutOpen = false; }

  /** Click numa bubble do mapa: abre/atualiza o ArtistCard. */
  function handleArtistClick(nextArtist) {
    selectedArtist = nextArtist;
  }

  /** Click numa obra do ArtworkStrip: trata como artistclick a partir do nome. */
  function handleArtistSelect(creator) {
    if (!creator) return;
    selectedArtist = { creator };
  }

  /** Fecha o ArtistCard e libera o mapa. */
  function handleArtistClose() {
    selectedArtist = null;
  }

  $: bubblesForMap = applyFilters(bubbles, {
    activeAcervos,
    activeGenders,
    selectedCreators,
    selectedSchools,
    selectedNationalities,
    selectedLocalidade: selectedLocalidade || null,
  }, localidadesReverseMap);
  // Disponibilidade por faceta (cross-filter N-1): para cada campo, considera todos
  // os outros filtros ativos. Alimenta o estado esmaecido/desabilitado das pills.
  $: availableOptions = computeAvailableOptions(bubbles, {
    activeAcervos,
    activeGenders,
    selectedCreators,
    selectedSchools,
    selectedNationalities,
    selectedLocalidade: selectedLocalidade || null,
  }, localidadesReverseMap);
  // Museus com obras de criadores visíveis no recorte atual (interseção com activeAcervos).
  // Mesma lógica de statsBlock.acervos — garante consistência com o contador.
  $: visibleMuseumNames = (() => {
    const artists = new Set(bubblesForMap.map(b => b.creator).filter(Boolean));
    const museums = new Set();
    for (const creator of artists) {
      const list = artworksByCreator.get(creator);
      if (!list) continue;
      for (const a of list) {
        if (activeAcervos.size > 0 && !activeAcervos.has(a.museum)) continue;
        if (a.museum) museums.add(a.museum);
      }
    }
    return museums;
  })();
  // Bubbles de acervo filtradas: apenas museus com obras de criadores visíveis.
  // Visibilidade da camada depende somente da pill ACERVO em `activeTypes` (filtrada no WorldMap).
  $: filteredAcervoBubbles = acervoBubbles.filter(b =>
    b.acervos.some(a => visibleMuseumNames.has(a))
  );
  $: bubblesWithAcervos = [...bubblesForMap, ...filteredAcervoBubbles];
  // Segmentos visíveis apenas quando ambos os extremos passam pelos filtros atuais (sidebar + header).
  $: visibleBubbleIds = new Set(bubblesForMap.filter(b => activeTypes.has(b.type)).map(b => b.id));
  $: trajectoriesForMap = showTrajectories ? applyTrajectoryFilter(trajectories, visibleBubbleIds) : [];
  // Opções de localidade: países + continentes únicos das bubbles carregadas, traduzidos conforme locale.
  $: allLocalidades = getLocalidadesList(bubbles, locale);
  // Mapa reverso: nome traduzido exibido em tela → valor canônico para comparação no filtro
  $: localidadesReverseMap = getLocalidadesReverseMap(locale);
  // Localidades disponíveis (nomes traduzidos) no recorte atual: converte o conjunto
  // canônico de `availableOptions.localidade` de volta aos nomes exibidos no autocomplete.
  $: availableLocalidades = new Set(
    allLocalidades.filter(name => availableOptions.localidade.has(localidadesReverseMap.get(name) ?? name))
  );

  // ── Obras para o ArtworkStrip: quando há artista selecionado, mostra só as
  // obras dele; caso contrário, flatmap dos criadores visíveis, dedup por id, ordenado.
  $: artworksForStrip = (() => {
    const isUndated = (y) => y === null || y === undefined || y === UNDATED_YEAR || typeof y !== 'number' || Number.isNaN(y);
    const sortWorks = (arr) => [...arr].sort((b, a) => {
      const au = isUndated(a.year); const bu = isUndated(b.year);
      if (au && bu) return 0; if (au) return 1; if (bu) return -1;
      return b.year - a.year;
    });
    if (selectedArtist?.creator) {
      const list = artworksByCreator.get(selectedArtist.creator) ?? [];
      const filtered = activeAcervos.size > 0 ? list.filter(art => activeAcervos.has(art.museum)) : list;
      return sortWorks(filtered);
    }
    const visibleCreators = new Set(bubblesForMap.map(b => b.creator).filter(Boolean));
    const seen = new Set();
    const out = [];
    for (const creator of visibleCreators) {
      const list = artworksByCreator.get(creator);
      if (!list) continue;
      for (const art of list) {
        if (seen.has(art.id)) continue;
        if (activeAcervos.size > 0 && !activeAcervos.has(art.museum)) continue;
        seen.add(art.id);
        out.push(art);
      }
    }
    return sortWorks(out);
  })();
  $: birthCount = bubblesForMap.filter(b => b.type === 'birth').length;
  $: deathCount = bubblesForMap.filter(b => b.type === 'death').length;

  // ── Stats agregados sobre o conjunto filtrado atual ────────────────
  $: statsBlock = (() => {
    const artists = new Set();
    const schools = new Set();
    for (const b of bubblesForMap) {
      if (b.creator) artists.add(b.creator);
      for (const s of b.educatedAt) schools.add(s);
    }
    let obras = 0;
    const acervos = new Set();
    for (const creator of artists) {
      const list = artworksByCreator.get(creator);
      if (!list) continue;
      for (const a of list) {
        if (activeAcervos.size > 0 && !activeAcervos.has(a.museum)) continue;
        obras++;
        if (a.museum) acervos.add(a.museum);
      }
    }
    return {
      acervos: visibleMuseumNames.size,
      artistas: artists.size,
      escolas: schools.size,
      obras,
    };
  })();
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<div class="layout" class:layout--sb-closed={!sidebarOpen} class:layout--mobile={isMobile}>

  {#if !isMobile}
    <Sidebar
      isOpen={sidebarOpen}
      onClose={handleCloseSidebar}
      onToggle={handleToggleSidebar}
      acervos={allAcervos}
      {activeAcervos}
      availableAcervos={availableOptions.acervos}
      {allGenders}
      {activeGenders}
      availableGenders={availableOptions.genders}
      {allCreators}
      {selectedCreators}
      availableCreators={availableOptions.creators}
      {allSchools}
      {selectedSchools}
      availableSchools={availableOptions.schools}
      {allNationalities}
      {selectedNationalities}
      availableNationalities={availableOptions.nationalities}
      {locale}
      onAcervoChange={handleAcervoChange}
      onGenderChange={handleGenderChange}
      onCreatorsChange={handleCreatorsChange}
      onSchoolsChange={handleSchoolsChange}
      onNationalitiesChange={handleNationalitiesChange}
      tutorialActive={!tutorialDismissed}
      onTutorialReopen={handleTutorialReopen}
      onAboutOpen={handleAboutOpen}
    />
  {/if}

  <div class="main-area">
  {#if isMobile}
    <div class="mobile-header-shell" use:measureChrome>
      <MobileHeader {locale} onAboutOpen={handleAboutOpen} />
    </div>

    <div class="mobile-filters" class:mobile-filters--open={accordionOpen} use:measureChrome={true}>
      <FilterAccordion items={ACCORDION_ITEMS} bind:expandedId={accordionExpandedId}>
        <div slot="level1" class="mobile-filters__panel">
          <SidebarFilters
            acervos={allAcervos}
            {activeAcervos}
            availableAcervos={availableOptions.acervos}
            {allGenders}
            {activeGenders}
            availableGenders={availableOptions.genders}
            {allCreators}
            {selectedCreators}
            availableCreators={availableOptions.creators}
            {allSchools}
            {selectedSchools}
            availableSchools={availableOptions.schools}
            {allNationalities}
            {selectedNationalities}
            availableNationalities={availableOptions.nationalities}
            {locale}
            onAcervoChange={handleAcervoChange}
            onGenderChange={handleGenderChange}
            onCreatorsChange={handleCreatorsChange}
            onSchoolsChange={handleSchoolsChange}
            onNationalitiesChange={handleNationalitiesChange}
          />
        </div>
        <div slot="level2" class="mobile-filters__panel mobile-filters__panel--header">
          <Header
            {activeTypes}
            {selectedLocalidade}
            localidades={allLocalidades}
            {availableLocalidades}
            {showTrajectories}
            {locale}
            onTypesChange={handleFilterChange}
            onLocalityChange={handleLocalidadeChange}
            onTrajectoriesChange={handleTrajectoriesChange}
            tutorialActive={!tutorialDismissed}
            onTutorialReopen={handleTutorialReopen}
          />
        </div>
      </FilterAccordion>
    </div>
  {:else}
    <header class="header" use:measureChrome>
      <div class="header__controls">
        <Header
          {activeTypes}
          {selectedLocalidade}
          localidades={allLocalidades}
          {availableLocalidades}
          {showTrajectories}
          {locale}
          onTypesChange={handleFilterChange}
          onLocalityChange={handleLocalidadeChange}
          onTrajectoriesChange={handleTrajectoriesChange}
          tutorialActive={!tutorialDismissed}
          onTutorialReopen={handleTutorialReopen}
        />
      </div>
    </header>
  {/if}

  <div class="content">
    <main class="map-container" style="--artwork-strip-inset: {artworkStripInset}px">
      {#if loading}
        <div class="state-message">{SECTION_LABELS[locale].loading}</div>
      {:else if error}
        <div class="state-message state-message--error">{SECTION_LABELS[locale].errorPrefix} {error}</div>
      {:else}
        <WorldMap
          bind:this={worldMapRef}
          bubbles={bubblesWithAcervos}
          trajectories={trajectoriesForMap}
          {activeTypes}
          {projectionType}
          {theme}
          {locale}
          locked={false}
          pinnedCreator={selectedArtist?.creator ?? null}
          bottomInset={artworkStripInset}
          onArtistClick={handleArtistClick}
        />
        {#if !tutorialDismissed}
          <div class="tutorial-overlay tutorial-overlay--center">
            <TutorialBox title={TUTORIAL_MAP_TITLE[locale]} onDismiss={handleTutorialDismiss}>
              {#if isMobile}
                <div class="tutorial-warning">{SECTION_LABELS[locale].tutorialMobileWarning}</div>
                <p><strong>{TUTORIAL_NAV_LABELS[locale].selection}</strong> {TUTORIAL_MAP_TEXT_MOBILE_SELECT[locale]}</p>
                <p><strong>{TUTORIAL_NAV_LABELS[locale].navigation}</strong> {TUTORIAL_MAP_TEXT_MOBILE_NAV[locale]}</p>
                <img class="tutorial-illo" src="{import.meta.env.BASE_URL}tutorial-nav-mobile.svg" alt="" />
                <p><strong>{TUTORIAL_NAV_LABELS[locale].zoom}</strong> {TUTORIAL_MAP_TEXT_MOBILE_ZOOM[locale]}</p>
                <img class="tutorial-illo" src="{import.meta.env.BASE_URL}tutorial-zoom-mobile.svg" alt="" />
              {:else}
                <img class="tutorial-illo" src="{import.meta.env.BASE_URL}tutorial-nav-desktop.svg" alt="" />
                <p><strong>{TUTORIAL_NAV_LABELS[locale].navigation}</strong> {TUTORIAL_MAP_TEXT_NAV[locale]}</p>
                <img class="tutorial-illo" src="{import.meta.env.BASE_URL}tutorial-zoom-desktop.svg" alt="" />
                <p><strong>{TUTORIAL_NAV_LABELS[locale].zoom}</strong> {TUTORIAL_MAP_TEXT_ZOOM[locale]}</p>
                <p><strong>{TUTORIAL_NAV_LABELS[locale].mapMode}</strong> {TUTORIAL_MAP_TEXT_2D[locale]}</p>
              {/if}
            </TutorialBox>
          </div>
        {/if}
        <ArtistCard
          artist={selectedArtist}
          allBubbles={bubbles}
          {artworksByCreator}
          {locale}
          onClose={handleArtistClose}
        />
        <div class="map-overlay-zoom">
          <ZoomButtons onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
        </div>
        <div class="map-overlay-right">
          <ProjectionToggle {projectionType} {locale} onChange={handleProjectionChange} />
        </div>
        <div class="map-overlay-theme">
          <ThemeToggle {theme} {locale} onThemeChange={handleThemeChange} />
        </div>
        <MapStats stats={statsBlock} {locale} />
        <ProfilePanel bubbles={bubblesForMap} {breakpoint} {locale} artworkStripInset={artworkStripInset} />
        {#if isMobile}
          <button
            class="tutorial-reopen-mobile"
            class:tutorial-reopen-mobile--active={!tutorialDismissed}
            style="bottom: {artworkStripInset + 12}px"
            on:click={handleTutorialReopen}
            aria-label="Tutorial"
          >
            <svg width="30" height="30" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.098 20.196C4.52087 20.196 0 15.6751 0 10.098C0 4.52087 4.52087 0 10.098 0C15.6751 0 20.196 4.52087 20.196 10.098C20.196 15.6751 15.6751 20.196 10.098 20.196ZM9.0882 9.0882V15.147H11.1078V9.0882H9.0882ZM9.0882 5.049V7.0686H11.1078V5.049H9.0882Z" fill="#BBBBBB"/>
            </svg>
          </button>
        {/if}
        <ArtworkStrip
          artworks={artworksForStrip}
          selectedCreator={selectedArtist?.creator ?? null}
          mobile={isMobile}
          {locale}
          bind:collapsed={artworkStripCollapsed}
          bind:renderedHeight={artworkStripHeight}
          onArtistSelect={handleArtistSelect}
        />
      {/if}
    </main>
  </div>
  </div>
</div>

{#if aboutOpen}
  <AboutModal {locale} onClose={handleAboutClose} />
{/if}

<style lang="scss">
  .layout {
    display: flex;
    flex-direction: row;
    height: 100vh;
    background: var(--bg);
    color: var(--txt);
    overflow: hidden;
  }

  .main-area {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 30px;
    padding: 16px 1.5rem 16px calc(1.5rem + 28px);
    min-height: 98px;
    box-sizing: border-box;
    background: var(--chrome-bg);
    color: var(--chrome-txt);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    flex-shrink: 0;
    flex-wrap: nowrap;
    overflow: visible;
  }

  .header__controls {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: nowrap;
    min-width: 0;
  }

  /* ─── Filtros mobile (FilterAccordion sobre o mapa) ─────────────────── */
  .mobile-header-shell {
    flex-shrink: 0;
  }

  .mobile-filters {
    flex-shrink: 0;
    position: relative;
    z-index: 30;
    background: var(--bg);
    border-bottom: 1px solid var(--bg-hl);
  }

  /* Quando um nível está expandido, o accordion vira overlay e cobre o mapa. */
  .mobile-filters--open {
    position: absolute;
    top: var(--mobile-header-height);
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 60;
    display: flex;
    flex-direction: column;
    border-bottom: none;
  }

  .mobile-filters__panel {
    padding: 0 20px 20px; /* MOBILE_PADDING_X */
    /* Level 1: "Museus e Artistas" — scroll contido na área visível */
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--bg-hl) transparent;
  }

  /* Limite de altura para o painel level 1 (SidebarFilters) em mobile — 
     deixa espaço para o painel level 2 quando aberto. */
  .mobile-filters__panel:not(.mobile-filters__panel--header) {
    max-height: calc(70vh - var(--menu-height));
  }

  .mobile-filters__panel--header {
    padding-top: 16px;
  }

  /* No mobile, o Header (controles) empilha verticalmente dentro do accordion. */
  .mobile-filters__panel--header :global(.header-bar) {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
    flex: none;
    width: 100%;
  }

  /* Seções do Header em mobile — ocupam 100% e podem quebrar se necessário. */
  .mobile-filters__panel--header :global(.header-section) {
    flex: none;
    width: 100%;
    min-width: 0;
  }

  /* Pills quebram em múltiplas linhas se necessário. */
  .mobile-filters__panel--header :global(.header-bar__pills) {
    flex-wrap: wrap;
  }

  /* A seção de localidade usa flex-basis (345px) para largura no desktop;
     em coluna isso vira altura e cria um vão — neutralizar no mobile. */
  .mobile-filters__panel--header :global(.header-section--locality) {
    flex: none;
    width: 100%;
  }

  /* Autocomplete ocupa 100% em mobile. */
  .mobile-filters__panel--header :global(.header-bar__locality) {
    width: 100%;
  }

  /* Trajectory group em mobile ocupa 100%. */
  .mobile-filters__panel--header :global(.trajectory-group) {
    flex-wrap: wrap;
  }

  /* Rótulos das seções podem quebrar linha em mobile. */
  .mobile-filters__panel--header :global(.header-section__label) {
    white-space: normal;
  }

  .content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .map-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--bg);
  }

  .map-overlay-zoom {
    position: absolute;
    bottom: calc(var(--artwork-strip-inset, 0px) + 16px);
    right: 16px;
    z-index: 10; /* acima do canvas, abaixo do ArtistCard (z-index: 20) */
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .map-overlay-right {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 10; /* acima do canvas, abaixo do ArtistCard (z-index: 20) */
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    transform: translateY(44px); /* empurra pra baixo para não colidir com botão de perfil dos resultados */
  }

  /* Toggle de tema (sol/lua) — centralizado verticalmente na área visível
     do mapa (descontando a faixa de obras na base), na borda direita.
     Referência Figma modo claro. */
  .map-overlay-theme {
    position: absolute;
    top: calc((100% - var(--artwork-strip-inset, 0px)) / 2);
    right: 16px;
    transform: translateY(-50%);
    z-index: 10;
    pointer-events: none;
  }

  /* ─── Tutorial overlays (Boxes 2 e 3) ──────────────────────────────── */
  .tutorial-overlay {
    position: absolute;
    z-index: 15; /* acima do map-stats (10), abaixo do ArtistCard (20) */
    pointer-events: none; /* passa cliques ao canvas; TutorialBox tem pointer-events: auto */
  }

  .tutorial-overlay--center {
    /* Desktop: canto superior esquerdo do mapa (alinhado à imagem handoff) */
    top: 16px;
    left: 16px;
  }

  /* Mobile: centraliza na área visível do mapa */
  @media (max-width: 759px) {
    .tutorial-overlay--center {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .tutorial-overlay--center :global(.tutorial-box) {
      width: 286px;
      padding: 16px 20px;
    }
  }

  /* Ilustrações (mouse/gestos) dentro da caixa de tutorial */
  .tutorial-illo {
    display: block;
    margin: 2px auto;
    max-width: 100%;
    height: auto;
  }

  /* Mobile: botão flutuante ⓘ para reabrir tutorial (canto inferior-esquerdo do mapa) */
  .tutorial-reopen-mobile {
    all: unset;
    position: absolute;
    left: 20px;
    z-index: 15;
    cursor: pointer;
    line-height: 0;
    transition: filter 0.12s;
    transform: translateY(-12px);
  }

  .tutorial-reopen-mobile--active :global(svg) {
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.65));
  }

  .state-message {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: var(--font-size-xs);
    color: var(--txt-hl);
  }

  .state-message--error {
    color: #e44;
  }

  .tutorial-warning {
    background: var(--bg-warning);
    color: var(--txt-warning);
    padding: 12px;
    border-radius: 4px;
    font-size: var(--font-size-md);
    margin: 12px 0 24px;
  }
</style>
