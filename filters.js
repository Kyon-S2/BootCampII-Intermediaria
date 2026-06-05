/**
 * filters.js — Filtro Exclusivo por Categoria (Finance Control System)
 * ✅ Totalmente alinhado com o novo app.js e index.html
 */

function filtrarRelatorioPorCategoria() {
  const seletorCategoria = document.getElementById('filtro-categoria');
  const categoriaSelecionada = seletorCategoria ? seletorCategoria.value : '';

  // 1. Obtém os elementos da tabela nativos do index.html
  const tbody = document.getElementById('tbody-relatorio');
  const totalRel = document.getElementById('total-rel');
  const emptyState = document.getElementById('empty-relatorio');

  if (!tbody) return;

  // 2. Limpa completamente a tabela antes de filtrar para evitar duplicações
  tbody.innerHTML = '';
  let totalAcumulado = 0;

  // 3. Filtra os dados usando o array global 'historico' do app.js
  if (!Array.isArray(historico)) return;

  const dadosFiltrados = historico.filter(item => {
    if (!item || item.valor === undefined) return false;
    if (!categoriaSelecionada || categoriaSelecionada === '') return true;
    return item.classe === categoriaSelecionada;
  });

  // 4. Caso não existam gastos na categoria selecionada
  if (dadosFiltrados.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (totalRel) totalRel.textContent = 'R$ 0,00';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // 5. Desenha as linhas correspondentes às 4 colunas do cabeçalho do index.html
  dadosFiltrados.forEach(g => {
    if (!g || g.valor === undefined) return;
    const valorNum = parseFloat(g.valor) || 0;
    totalAcumulado += valorNum;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(g.nome)}</td>
      <td class="valor-cel">R$ ${formatVal(g.valor)}</td>
      <td><span class="tag-categoria">${escHtml(g.classe)}</span></td>
      <td>${escHtml(g.data)}</td>
    `;
    tbody.appendChild(tr);
  });

  // 6. Atualiza o total acumulado na interface
  if (totalRel) {
    totalRel.textContent = `R$ ${formatVal(totalAcumulado)}`;
  }
}

// Inicializa os escutadores do select de filtro
function inicializarFiltros() {
  const filtroCategoria = document.getElementById('filtro-categoria');
  const btnLimpar = document.getElementById('filtros-limpar');

  if (filtroCategoria) {
    filtroCategoria.addEventListener('change', filtrarRelatorioPorCategoria);
  }

  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      if (filtroCategoria) filtroCategoria.value = '';
      filtrarRelatorioPorCategoria();
    });
  }

  // ✅ CORREÇÃO: Sincroniza com o nome do evento disparado pelo novo app.js
  window.addEventListener('dadosAtualizados', filtrarRelatorioPorCategoria);
}

// Garante que o script é executado no momento correto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarFiltros);
} else {
  inicializarFiltros();
}