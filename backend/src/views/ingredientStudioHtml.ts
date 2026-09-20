export function renderIngredientViewerHtml(): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ingredient Icon Studio • Open Food Facts Edition</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --panel-bg: #0f172a;
      --card-bg: #131d31;
      --card-selected: #1b2e4b;
      --border: #1e293b;
      --border-focus: #10b981;
      --text: #f1f5f9;
      --text-muted: #64748b;
      --text-sub: #94a3b8;
      --primary: #10b981;
      --primary-hover: #059669;
      --accent: #6366f1;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }
    body { background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

    /* Top Dev Header */
    header {
      height: 52px;
      background: var(--panel-bg);
      border-bottom: 1px solid var(--border);
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      gap: 12px;
    }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .logo { font-size: 15px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; letter-spacing: -0.3px; }
    .edition-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; background: #064e3b; color: #6ee7b7; padding: 2px 6px; border-radius: 4px; border: 1px solid #059669; font-family: 'JetBrains Mono', monospace; }
    
    .header-right { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .pill-stat { background: #131d31; border: 1px solid var(--border); padding: 4px 10px; border-radius: 6px; font-weight: 500; color: var(--text-sub); }
    .pill-stat span { color: var(--primary); font-weight: 700; }
    .pill-warn { background: #261b0a; border: 1px solid #78350f; padding: 4px 10px; border-radius: 6px; font-weight: 500; color: #fde68a; }
    .pill-warn span { color: #f59e0b; font-weight: 700; }
    .pill-cost { background: #131d31; border: 1px solid #312e81; padding: 4px 10px; border-radius: 6px; font-weight: 500; color: #a5b4fc; }
    .pill-cost span { color: #818cf8; font-weight: 700; }

    .btn-repack {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-repack:hover { background: #334155; color: #fff; border-color: #64748b; }

    /* Source Tabs Bar */
    .tabs-bar {
      height: 42px;
      background: #0b1120;
      border-bottom: 1px solid var(--border);
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .tab-btn {
      background: transparent;
      color: var(--text-muted);
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .tab-btn:hover { color: var(--text); background: rgba(255,255,255,0.05); }
    .tab-btn.active { color: #fff; background: #1e293b; border: 1px solid #334155; }
    .tab-badge { font-size: 10px; padding: 1px 5px; border-radius: 9999px; background: rgba(255,255,255,0.1); }
    .tab-btn.active .tab-badge { background: var(--primary); color: #000; font-weight: 700; }

    /* Main Split Layout */
    .split-layout { display: flex; flex: 1; height: calc(100vh - 94px); overflow: hidden; }

    /* Left Pane */
    .left-pane {
      width: 50%;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      background: var(--bg);
    }
    .filter-bar {
      padding: 12px;
      background: var(--panel-bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .search-input {
      width: 100%;
      background: #131d31;
      border: 1px solid var(--border);
      color: #fff;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
    }
    .search-input:focus { border-color: var(--border-focus); }
    .filter-row { display: flex; gap: 8px; }
    select {
      background: #131d31;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
      cursor: pointer;
    }
    select:focus { border-color: var(--border-focus); }
    .btn-batch {
      background: var(--primary);
      color: #064e3b;
      font-weight: 700;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .btn-batch:hover { background: var(--primary-hover); }

    /* Batch Progress Bar */
    .batch-progress {
      display: none;
      background: #131d31;
      border-bottom: 1px solid var(--border);
      padding: 8px 12px;
      flex-direction: column;
      gap: 4px;
    }
    .batch-progress.active { display: flex; }
    .progress-bar-track { width: 100%; height: 6px; background: #1e293b; border-radius: 3px; overflow: hidden; }
    .progress-bar-fill { width: 0%; height: 100%; background: var(--primary); transition: width 0.15s; }

    /* List Container */
    .list-container {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 8px;
      align-content: start;
    }
    .grid-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.12s;
      position: relative;
    }
    .grid-card:hover { border-color: #334155; transform: translateY(-1px); }
    .grid-card.selected { background: var(--card-selected); border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }

    .card-thumb {
      width: 38px;
      height: 38px;
      min-width: 38px;
      border-radius: 9999px;
      background: #090d16;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .card-thumb img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      -webkit-mask-image: radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 80%);
      mask-image: radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 80%);
    }
    .card-info { flex: 1; min-width: 0; }
    .card-title { font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-meta { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--text-muted); margin-top: 2px; }
    .cat-badge { background: #1e293b; color: #94a3b8; padding: 1px 4px; border-radius: 3px; font-size: 9px; font-family: 'JetBrains Mono', monospace; }
    .hit-badge { background: #064e3b; color: #6ee7b7; padding: 1px 4px; border-radius: 3px; font-size: 9px; font-weight: 700; }

    /* Right Inspector Pane */
    .right-pane {
      width: 50%;
      background: var(--panel-bg);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 24px;
      gap: 20px;
    }
    .inspector-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .inspector-title h2 { font-size: 20px; font-weight: 700; color: #fff; }
    .inspector-title p { font-size: 13px; color: var(--text-muted); margin-top: 2px; font-family: 'JetBrains Mono', monospace; }
    
    .arena-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .arena-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-sub); letter-spacing: 0.5px; }
    .simulation-row { display: flex; gap: 16px; align-items: center; justify-content: center; padding: 20px; border-radius: 8px; }
    .sim-light { background: #f8fafc; color: #0f172a; }
    .sim-dark { background: #0f172a; color: #f8fafc; }

    .preview-circle-lg {
      width: 56px;
      height: 56px;
      min-width: 56px;
      border-radius: 9999px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .preview-circle-lg img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      -webkit-mask-image: radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.6) 58%, rgba(0,0,0,0) 80%);
      mask-image: radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.6) 58%, rgba(0,0,0,0) 80%);
    }

    .master-preview {
      width: 100%;
      max-width: 320px;
      aspect-ratio: 1/1;
      margin: 0 auto;
      background: #000;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .master-preview img { width: 100%; height: 100%; object-fit: contain; }

    .action-row { display: flex; gap: 8px; }
    .btn-action-primary {
      flex: 1;
      background: var(--primary);
      color: #064e3b;
      font-weight: 700;
      border: none;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-action-primary:hover { background: var(--primary-hover); }
    .btn-action-secondary {
      flex: 1;
      background: #1e293b;
      color: #cbd5e1;
      font-weight: 600;
      border: 1px solid #334155;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-action-secondary:hover { background: #334155; color: #fff; }

    .meta-table { font-size: 12px; display: flex; flex-direction: column; gap: 6px; font-family: 'JetBrains Mono', monospace; }
    .meta-row { display: flex; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 4px; }
    .meta-row span { color: var(--text-muted); }
    .meta-row strong { color: #cbd5e1; }

    /* Lightbox Modal */
    .lightbox-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    }
    .lightbox-modal.active { display: flex; }
    .lightbox-img { max-width: 90vw; max-height: 90vh; border-radius: 8px; border: 1px solid #334155; }

    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1e293b;
      border: 1px solid var(--primary);
      color: #fff;
      padding: 10px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      z-index: 999;
      transform: translateY(80px);
      opacity: 0;
      transition: all 0.25s;
    }
    .toast.show { transform: translateY(0); opacity: 1; }
  </style>
</head>
<body>
  <!-- Header -->
  <header>
    <div class="header-left">
      <div class="logo">🥑 Icon Studio</div>
      <span class="edition-tag">Open Food Facts & BaseName</span>
    </div>
    <div class="header-right">
      <div class="pill-stat">Assets: <span id="statDiskCount">0</span></div>
      <div class="pill-warn">Fehlend in DB: <span id="statMissingCount">0</span></div>
      <div class="pill-cost">💰 <span id="statCostTotal">$0.00</span> <span id="statCostEur">(~0.00 €)</span></div>
      <button class="btn-repack" onclick="repackZipArchive()">📦 Zip neu packen</button>
    </div>
  </header>

  <!-- Source Tabs Bar -->
  <div class="tabs-bar">
    <button class="tab-btn active" id="tabDisk" onclick="switchSource('disk')">
      📦 Assets auf Disk <span class="tab-badge" id="tabDiskBadge">0</span>
    </button>
    <button class="tab-btn" id="tabMissing" onclick="switchSource('missing')">
      ⚠️ Fehlend in Rezepten <span class="tab-badge" id="tabMissingBadge">0</span>
    </button>
    <button class="tab-btn" id="tabMappings" onclick="switchSource('mappings')">
      🗄️ Alle DB-Mappings <span class="tab-badge" id="tabMappingsBadge">0</span>
    </button>
    <button class="tab-btn" id="tabOff" onclick="switchSource('off')">
      🛒 Open Food Facts Topseller
    </button>
  </div>

  <!-- Split Screen View -->
  <div class="split-layout">
    <!-- Left Pane -->
    <div class="left-pane">
      <div class="filter-bar">
        <input type="text" id="searchInput" class="search-input" placeholder="Zutat suchen (z. B. strained_tomato, butter, burrata...)" />
        <div class="filter-row">
          <select id="categorySelect" style="flex: 1;">
            <option value="ALL">Alle Kategorien</option>
            <option value="FRUITS_VEGETABLES">🥦 Obst & Gemüse</option>
            <option value="DAIRY_EGGS">🧀 Milch & Eier</option>
            <option value="MEAT_POULTRY">🍗 Fleisch & Geflügel</option>
            <option value="FISH_SEAFOOD">🐟 Fisch & Meeresfrüchte</option>
            <option value="GRAINS_BAKERY">🌾 Getreide & Brot</option>
            <option value="OILS_CONDIMENTS">🫒 Öle, Saucen & Essig</option>
            <option value="SPICES_SEASONINGS">🧂 Gewürze & Kräuter</option>
            <option value="SWEETS_SNACKS">🍫 Süßes & Snacks</option>
            <option value="BEVERAGES">🥤 Getränke</option>
            <option value="FROZEN">🧊 Tiefkühl</option>
            <option value="OTHER">🍽️ Sonstiges</option>
          </select>
          <select id="statusSelect">
            <option value="all">Alle Status</option>
            <option value="true">Nur Vorhandene</option>
            <option value="false">Nur Fehlende</option>
          </select>
          <select id="concurrencySelect" title="Parallelität">
            <option value="10">⚡ 10x</option>
            <option value="5" selected>⚡ 5x</option>
            <option value="3">⚡ 3x</option>
            <option value="1">1x</option>
          </select>
          <button class="btn-batch" id="btnBatch" onclick="startBatchGeneration()">
            ⚡ Batch (<span id="batchCount">0</span>)
          </button>
        </div>
      </div>

      <div class="batch-progress" id="batchBar">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-sub);">
          <strong id="batchTitle">Batch läuft...</strong>
          <span id="batchProgressText">0 / 0</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" id="batchProgressFill"></div>
        </div>
        <button class="btn-action-secondary" onclick="cancelBatch()" style="padding: 4px 10px; font-size: 11px; margin-top: 2px;">
          Abbrechen
        </button>
      </div>

      <div class="list-container" id="ingredientsList"></div>
    </div>

    <!-- Right Pane: Live Inspector Arena -->
    <div class="right-pane" id="rightPane">
      <div id="inspectorContent">
        <div style="color: var(--text-muted); text-align: center; margin-top: 120px;">
          Wähle eine Zutat aus der linken Liste aus
        </div>
      </div>
    </div>
  </div>

  <!-- Lightbox Modal -->
  <div class="lightbox-modal" id="lightboxModal" onclick="closeLightbox()">
    <img id="lightboxImg" class="lightbox-img" src="" alt="Vollbild" onclick="event.stopPropagation()" />
  </div>

  <div class="toast" id="toast"></div>

  <script>
    let currentSource = 'disk';
    let ingredients = [];
    let selectedItem = null;
    let isBatchRunning = false;
    let cancelBatchRequested = false;

    const list = document.getElementById('ingredientsList');
    const inspectorContent = document.getElementById('inspectorContent');
    const searchInput = document.getElementById('searchInput');
    const categorySelect = document.getElementById('categorySelect');
    const statusSelect = document.getElementById('statusSelect');
    const concurrencySelect = document.getElementById('concurrencySelect');
    const statDiskCount = document.getElementById('statDiskCount');
    const statMissingCount = document.getElementById('statMissingCount');
    const statCostTotal = document.getElementById('statCostTotal');
    const statCostEur = document.getElementById('statCostEur');
    const tabDiskBadge = document.getElementById('tabDiskBadge');
    const tabMissingBadge = document.getElementById('tabMissingBadge');
    const tabMappingsBadge = document.getElementById('tabMappingsBadge');
    const batchCount = document.getElementById('batchCount');
    const batchBar = document.getElementById('batchBar');
    const batchProgressText = document.getElementById('batchProgressText');
    const batchProgressFill = document.getElementById('batchProgressFill');
    const toast = document.getElementById('toast');
    const lightboxModal = document.getElementById('lightboxModal');
    const lightboxImg = document.getElementById('lightboxImg');

    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function switchSource(source) {
      currentSource = source;
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      if (source === 'disk') document.getElementById('tabDisk').classList.add('active');
      if (source === 'missing') document.getElementById('tabMissing').classList.add('active');
      if (source === 'mappings') document.getElementById('tabMappings').classList.add('active');
      if (source === 'off') document.getElementById('tabOff').classList.add('active');
      loadData();
    }

    async function loadData() {
      const q = encodeURIComponent(searchInput.value.trim());
      const cat = encodeURIComponent(categorySelect.value);
      const hasImg = encodeURIComponent(statusSelect.value);
      
      const res = await fetch('/api/dev/ingredients?source=' + currentSource + '&search=' + q + '&category=' + cat + '&hasImage=' + hasImg + '&limit=1500');
      const data = await res.json();
      
      if (!data.success) return;

      ingredients = data.items;
      if (data.stats) {
        statDiskCount.textContent = data.stats.diskCount || 0;
        statMissingCount.textContent = data.stats.missingCount || 0;
        tabDiskBadge.textContent = data.stats.diskCount || 0;
        tabMissingBadge.textContent = data.stats.missingCount || 0;
        tabMappingsBadge.textContent = data.stats.mappingsCount || 0;
        
        if (data.stats.costs) {
          statCostTotal.textContent = '$' + (data.stats.costs.totalCostUsd || 0).toFixed(4);
          statCostEur.textContent = '(~' + (data.stats.costs.approxEur || 0).toFixed(2) + ' €)';
        }
      }

      const missingInView = ingredients.filter(i => !i.hasImage).length;
      batchCount.textContent = missingInView;

      renderList();

      if (selectedItem) {
        const found = ingredients.find(i => i.id === selectedItem.id);
        selectItem(found || ingredients[0] || null);
      } else if (ingredients.length > 0) {
        selectItem(ingredients[0]);
      }
    }

    function renderList() {
      list.innerHTML = '';
      if (ingredients.length === 0) {
        list.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 40px; font-size: 13px; grid-column: 1 / -1;">Keine Zutaten gefunden.</div>';
        return;
      }

      for (const item of ingredients) {
        const card = document.createElement('div');
        const isSelected = selectedItem && selectedItem.id === item.id;
        card.className = 'grid-card' + (isSelected ? ' selected' : '');
        card.id = 'card-' + item.id;
        card.onclick = () => selectItem(item);

        const thumbImg = item.hasImage && item.imageUrl
          ? '<img src="' + item.imageUrl + '" alt="' + item.name_en + '" loading="lazy" />'
          : '<div style="font-size:16px;">🍽️</div>';

        const hitBadge = item.hitCount ? '<span class="hit-badge">🔥 ' + item.hitCount + '</span>' : '';

        card.innerHTML = 
          '<div class="card-thumb">' + thumbImg + '</div>' +
          '<div class="card-info">' +
            '<div class="card-title" title="' + item.name_en + '">' + item.name_en + '</div>' +
            '<div class="card-meta">' +
              '<span class="cat-badge">' + item.category + '</span>' +
              hitBadge +
            '</div>' +
          '</div>';

        list.appendChild(card);
      }
    }

    function selectItem(item) {
      if (!item) {
        inspectorContent.innerHTML = '<div style="color: var(--text-muted); text-align: center; margin-top: 120px;">Keine Zutat ausgewählt</div>';
        return;
      }

      selectedItem = item;
      document.querySelectorAll('.grid-card').forEach(c => c.classList.remove('selected'));
      const activeCard = document.getElementById('card-' + item.id);
      if (activeCard) activeCard.classList.add('selected');

      renderInspector();
    }

    function renderInspector() {
      const item = selectedItem;
      if (!item) return;

      const hasImg = item.hasImage && item.imageUrl;
      const publicUrl = '/api/ingredient-icons/' + item.slug + '.webp';

      inspectorContent.innerHTML = 
        '<div class="inspector-header">' +
          '<div class="inspector-title">' +
            '<h2>' + item.name_en + '</h2>' +
            '<p>' + item.slug + '.webp</p>' +
          '</div>' +
          '<button class="btn-action-primary" style="flex:0; padding:8px 16px; white-space:nowrap;" id="btnGenSingle" onclick="generateSingle(\\'' + item.id + '\\')">' +
            (hasImg ? '🔄 Neu generieren' : '✨ Icon generieren') +
          '</button>' +
        '</div>' +

        '<div class="arena-box">' +
          '<div class="arena-title">📱 Frontend Simulation (100% Radius & Radial Mask)</div>' +
          '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">' +
            '<div class="simulation-row sim-light">' +
              '<div class="preview-circle-lg" style="background:#ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">' +
                (hasImg ? '<img src="' + item.imageUrl + '" alt="" />' : '🍽️') +
              '</div>' +
              '<div style="font-size:12px; font-weight:600;">Light Card</div>' +
            '</div>' +
            '<div class="simulation-row sim-dark">' +
              '<div class="preview-circle-lg" style="background:rgba(255,255,255,0.08);">' +
                (hasImg ? '<img src="' + item.imageUrl + '" alt="" />' : '🍽️') +
              '</div>' +
              '<div style="font-size:12px; font-weight:600; color:#fff;">Dark Card</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="arena-box">' +
          '<div class="arena-title">🖼️ Studio Master Asset (512 × 512 px)</div>' +
          '<div class="master-preview" onclick="' + (hasImg ? 'openLightbox(\\'' + item.imageUrl + '\\')' : 'generateSingle(\\'' + item.id + '\\')') + '">' +
            (hasImg ? '<img src="' + item.imageUrl + '" alt="' + item.name_en + '" />' : '<div style="color:var(--text-muted); font-size:13px;">Klicken zum Generieren</div>') +
          '</div>' +
        '</div>' +

        '<div class="action-row">' +
          '<button class="btn-action-secondary" onclick="copyToClipboard(\\'' + publicUrl + '\\')">📋 API-URL kopieren</button>' +
          (hasImg ? '<button class="btn-action-secondary" onclick="openLightbox(\\'' + item.imageUrl + '\\')">🔍 Vollbild</button>' : '') +
          (hasImg ? '<a class="btn-action-secondary" style="text-decoration:none;" href="' + item.imageUrl + '" download="' + item.slug + '.webp">💾 Download</a>' : '') +
        '</div>' +

        '<div class="arena-box">' +
          '<div class="arena-title">📋 Asset & API Details</div>' +
          '<div class="meta-table">' +
            '<div class="meta-row"><span>Slug / BaseName:</span><strong>' + item.slug + '</strong></div>' +
            '<div class="meta-row"><span>Kategorie:</span><strong>' + item.category + '</strong></div>' +
            '<div class="meta-row"><span>Öffentliche URL:</span><strong>' + publicUrl + '</strong></div>' +
            '<div class="meta-row"><span>Status:</span><strong>' + (hasImg ? '✅ Asset verfügbar' : '⚠️ Fehlend') + '</strong></div>' +
          '</div>' +
        '</div>';
    }

    function copyToClipboard(text) {
      navigator.clipboard.writeText(window.location.origin + text);
      showToast('📋 API-URL in Zwischenablage kopiert!');
    }

    function openLightbox(url) {
      if (!url) return;
      lightboxImg.src = url;
      lightboxModal.classList.add('active');
    }

    function closeLightbox() {
      lightboxModal.classList.remove('active');
    }

    async function repackZipArchive() {
      showToast('📦 Packe ingredient-icons.zip...');
      try {
        const res = await fetch('/api/dev/ingredients/repack-zip', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('✅ Zip gepackt: ' + data.fileCount + ' Icons (' + data.zipSizeMb + ' MB)');
        } else {
          showToast('❌ Fehler beim Packen: ' + (data.error || 'Unbekannt'));
        }
      } catch (e) {
        showToast('❌ Netzwerkfehler beim Packen');
      }
    }

    async function generateSingle(id) {
      const btn = document.getElementById('btnGenSingle');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Generiere Flux...';
      }

      try {
        const res = await fetch('/api/dev/ingredients/' + encodeURIComponent(id) + '/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: selectedItem ? selectedItem.category : 'OTHER' }),
        });
        const data = await res.json();

        if (data.success && data.item) {
          showToast('✨ Icon für ' + data.item.name_en + ' erfolgreich generiert!');
          const freshUrl = data.item.imageUrl || ('/api/ingredient-icons/' + data.item.filename + '?v=' + Date.now());

          if (selectedItem && (selectedItem.id === id || selectedItem.slug === id)) {
            selectedItem.hasImage = true;
            selectedItem.imageUrl = freshUrl;
            selectedItem.filename = data.item.filename;
            renderInspector();
          }

          const itemIdx = ingredients.findIndex(i => i.id === id || i.slug === id);
          if (itemIdx !== -1) {
            ingredients[itemIdx].hasImage = true;
            ingredients[itemIdx].imageUrl = freshUrl;
            ingredients[itemIdx].filename = data.item.filename;
          }
          
          renderList();
          loadData();
        } else {
          showToast('❌ Fehler: ' + (data.error || 'Generierung fehlgeschlagen'));
        }
      } catch (e) {
        showToast('❌ Netzwerkfehler bei Generierung');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '🔄 Neu generieren';
        }
      }
    }

    async function startBatchGeneration() {
      const missingItems = ingredients.filter(i => !i.hasImage);
      if (missingItems.length === 0) {
        showToast('ℹ️ Keine fehlenden Icons in dieser Ansicht!');
        return;
      }

      isBatchRunning = true;
      cancelBatchRequested = false;
      batchBar.classList.add('active');

      const concurrency = parseInt(concurrencySelect.value, 10) || 5;
      let completed = 0;
      const total = missingItems.length;

      batchProgressText.textContent = '0 / ' + total;
      batchProgressFill.style.width = '0%';

      async function worker(queue) {
        while (queue.length > 0 && !cancelBatchRequested) {
          const item = queue.shift();
          if (!item) break;
          try {
            const res = await fetch('/api/dev/ingredients/' + encodeURIComponent(item.id) + '/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ category: item.category }),
            });
            const data = await res.json();
            if (data.success && data.item) {
              item.hasImage = true;
              item.imageUrl = data.item.imageUrl || ('/api/ingredient-icons/' + data.item.filename + '?v=' + Date.now());
              item.filename = data.item.filename;
            }
          } catch {}
          completed++;
          const pct = Math.round((completed / total) * 100);
          batchProgressText.textContent = completed + ' / ' + total;
          batchProgressFill.style.width = pct + '%';
        }
      }

      const queue = [...missingItems];
      const workers = Array.from({ length: concurrency }, () => worker(queue));
      await Promise.all(workers);

      isBatchRunning = false;
      batchBar.classList.remove('active');
      showToast('🎉 Batch-Generierung abgeschlossen (' + completed + ' Icons)');
      loadData();
    }

    function cancelBatch() {
      cancelBatchRequested = true;
      showToast('⏹️ Breche Batch ab...');
    }

    searchInput.addEventListener('input', () => loadData());
    categorySelect.addEventListener('change', () => loadData());
    statusSelect.addEventListener('change', () => loadData());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    });

    loadData();
  </script>
</body>
</html>`;
}
