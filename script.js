 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/script.js b/script.js
index 89d172c523260cddebd2aa89b0c7d19dfe3af77e..147f1e320b9b138d5ba2c7541de486e9581b4273 100644
--- a/script.js
+++ b/script.js
@@ -1,30 +1,36 @@
 // script.js - VERSÃO COMPLETA PRO
 const el = id => document.getElementById(id);
 const num = id => {const v = parseFloat(el(id).value); return Number.isFinite(v) && v >= 0 ? v : 0;};
 const brl = v => v.toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
 const debounce = (f, w) => {let t; return (...a) => {clearTimeout(t); t = setTimeout(() => f(...a), w);};};
+const escapeHtml = (value = '') => value
+  .replaceAll('&', '&amp;')
+  .replaceAll('<', '&lt;')
+  .replaceAll('>', '&gt;')
+  .replaceAll('"', '&quot;')
+  .replaceAll("'", '&#39;');
 
 const showToast = (msg, type = 'success') => {
   const toast = el('toast');
   toast.textContent = msg;
   toast.className = `toast show ${type}`;
   setTimeout(() => toast.classList.remove('show'), 3000);
 };
 
 // ========== CONSTANTES ==========
 const STORAGE_KEY = 'calc3d_pro';
 const HISTORICO_KEY = 'calc3d_historico';
 const REC = {peso:80, precoKg:120, margem:40, custoHora:2.00, tempoHoras:6, tempoMinutos:0};
 
 // TEMPLATES PRÉ-DEFINIDOS
 const TEMPLATES = {
   miniatura: {peso:50, precoKg:150, margem:45, custoHora:2.5, tempoHoras:8, tempoMinutos:0},
   funcional: {peso:120, precoKg:100, margem:35, custoHora:2.0, tempoHoras:12, tempoMinutos:30},
   presente: {peso:80, precoKg:130, margem:50, custoHora:2.0, tempoHoras:6, tempoMinutos:0},
   industrial: {peso:300, precoKg:90, margem:30, custoHora:3.0, tempoHoras:24, tempoMinutos:0}
 };
 
 // ========== ESTADO ==========
 let modo = "basico", lastCalc = {custoTotal:0, custoFilamento:0, custoMaquina:0};
 let grafico = null;
 
@@ -214,112 +220,121 @@ function atualizarGrafico() {
       data: {
         labels: ['Filamento', 'Máquina', 'Lucro'],
         datasets: [{
           data: [cf, cm, lucro > 0 ? lucro : 0],
           backgroundColor: ['#f5c542', '#ff8c42', lucro > 0 ? '#5ac878' : '#ff5c5c']
         }]
       },
       options: {
         responsive: true,
         maintainAspectRatio: false,
         plugins: {
           legend: {labels: {color: '#e8eaf0'}},
           title: {display: true, text: 'Distribuição do Preço', color: '#e8eaf0'}
         }
       }
     });
   }
 }
 
 // ========== MODO CLIENTE ==========
 function atualizarModoCliente() {
   const cf = lastCalc.custoFilamento || 0;
   const cm = lastCalc.custoMaquina || 0;
   const maoObra = cf * 0.2; // 20% do material como mão de obra
   const total = cf + cm + maoObra;
-  
+  const margemPct = num('margem');
+  const precoSugerido = margemPct >= 100 ? 0 : (lastCalc.custoTotal || 0) / (1 - (margemPct / 100));
+
   el('clienteFilamento').textContent = brl(cf);
   el('clienteMaquina').textContent = brl(cm);
   el('clienteMaoObra').textContent = brl(maoObra);
   el('clienteTotal').textContent = brl(total);
+
+  const resumo = `Último cálculo: ${num('peso').toFixed(1)}g | ${brl(num('precoKg'))}/kg | Margem ${margemPct.toFixed(1)}% | Sugerido ${brl(precoSugerido)}`;
+  el('ultimoCalculoCliente').textContent = resumo;
 }
 
 // ========== COMPARAÇÃO ==========
 el('btnCompararAgora')?.addEventListener('click', () => {
   const ct = lastCalc.custoTotal || 0;
   
   ['A', 'B', 'C'].forEach(c => {
     const m = num(`margem${c}`) / 100;
     const preco = ct / (1 - m);
     const lucro = preco - ct;
     el(`preco${c}`).textContent = brl(preco);
     el(`lucro${c}`).textContent = brl(lucro);
   });
   
   showToast('✅ Comparação atualizada!', 'success');
 });
 
 // ========== HISTÓRICO ==========
 function salvarNoHistorico(nome) {
   const hist = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
   const item = {
     id: Date.now(),
     nome: nome || 'Sem nome',
     data: new Date().toLocaleString('pt-BR'),
     peso: num('peso'),
     precoKg: num('precoKg'),
     margem: num('margem'),
     custoTotal: lastCalc.custoTotal,
     precoSugerido: lastCalc.custoTotal / (1 - num('margem') / 100)
   };
   hist.unshift(item);
   if(hist.length > 10) hist.pop();
   localStorage.setItem(HISTORICO_KEY, JSON.stringify(hist));
   showToast('💾 Salvo no histórico!', 'success');
   carregarHistorico();
 }
 
 function carregarHistorico() {
   const hist = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
   const lista = el('listaHistorico');
   if(hist.length === 0) {
     lista.innerHTML = '<div class="empty-state">Nenhum cálculo salvo ainda.</div>';
     return;
   }
-  lista.innerHTML = hist.map(h => `
+  lista.innerHTML = hist.map(h => {
+    const nomeSeguro = escapeHtml(String(h.nome ?? 'Sem nome'));
+    const dataSegura = escapeHtml(String(h.data ?? ''));
+    return `
     <div class="historico-item">
       <div>
-        <div class="historico-nome">${h.nome}</div>
-        <div class="historico-data">${h.data}</div>
+        <div class="historico-nome">${nomeSeguro}</div>
+        <div class="historico-data">${dataSegura}</div>
       </div>
       <div class="historico-valor">${brl(h.precoSugerido)}</div>
       <div class="historico-acoes">
         <button class="btn btn-pequeno" onclick="carregarDoHistorico(${h.id})">📥 Carregar</button>
         <button class="btn btn-pequeno" onclick="excluirDoHistorico(${h.id})">🗑️</button>
       </div>
     </div>
-  `).join('');
+  `;
+  }).join('');
 }
 
 window.carregarDoHistorico = (id) => {
   const hist = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
   const item = hist.find(h => h.id === id);
   if(!item) return;
   el('peso').value = item.peso;
   el('precoKg').value = item.precoKg;
   el('margem').value = item.margem;
   calcular();
   document.querySelector('[data-tab="calculadora"]').click();
   showToast('📥 Cálculo carregado!', 'success');
 };
 
 window.excluirDoHistorico = (id) => {
   let hist = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
   hist = hist.filter(h => h.id !== id);
   localStorage.setItem(HISTORICO_KEY, JSON.stringify(hist));
   carregarHistorico();
   showToast('🗑️ Excluído!', 'success');
 };
 
 // ========== EXPORTAR CSV ==========
 el('btnExportarCSV')?.addEventListener('click', () => {
   const hist = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
@@ -337,51 +352,55 @@ el('btnExportarCSV')?.addEventListener('click', () => {
   link.click();
   showToast('📑 CSV exportado!', 'success');
 });
 
 // ========== CALCULADORA DE CUSTO/HORA ==========
 el('btnCalcCusto')?.addEventListener('click', () => {
   el('modalCalcCusto').classList.add('show');
   calcularCustoHora();
 });
 
 function calcularCustoHora() {
   const consumo = num('consumoW') / 1000;
   const kwh = num('precoKwh');
   const deprec = num('depreciacaoHora');
   const tempo = num('tempoMonitora');
   const custoEnergia = consumo * kwh;
   const total = custoEnergia + deprec + tempo;
   el('custoCalculado').textContent = brl(total);
 }
 
 ['consumoW', 'precoKwh', 'depreciacaoHora', 'tempoMonitora'].forEach(id => {
   el(id)?.addEventListener('input', calcularCustoHora);
 });
 
 el('btnAplicarCusto')?.addEventListener('click', () => {
-  const total = parseFloat(el('custoCalculado').textContent.replace(/[^\d,]/g, '').replace(',', '.'));
+  const totalStr = el('custoCalculado').textContent
+    .replace(/[^\d,]/g, '')
+    .replace(/\./g, '')
+    .replace(',', '.');
+  const total = parseFloat(totalStr) || 0;
   el('custoHora').value = total.toFixed(2);
   el('modalCalcCusto').classList.remove('show');
   showToast('✅ Custo/hora aplicado!', 'success');
   calcular();
 });
 
 // ========== SALVAR NO HISTÓRICO (MODAL) ==========
 el('btnSalvarCalculo')?.addEventListener('click', () => {
   if(lastCalc.custoTotal === 0) return showToast('Calcule primeiro!', 'error');
   el('modalSalvarHistorico').classList.add('show');
   el('nomeCalculo').value = '';
   el('nomeCalculo').focus();
 });
 
 el('btnConfirmarSalvar')?.addEventListener('click', () => {
   const nome = el('nomeCalculo').value.trim() || 'Sem nome';
   salvarNoHistorico(nome);
   el('modalSalvarHistorico').classList.remove('show');
 });
 
 // ========== GERAR ORÇAMENTO CLIENTE PDF ==========
 el('btnGerarOrcamento')?.addEventListener('click', () => {
   const nome = el('nomeCliente').value.trim() || 'Cliente';
   const projeto = el('nomeProjeto').value.trim() || 'Projeto';
   
 
EOF
)
