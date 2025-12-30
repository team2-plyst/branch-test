/**
 * 파일: js/main.js
 * 목적: 메인 페이지 상호작용(카드 렌더링, 검색/필터, 모달, 사이드바 토글)
 * API 개요:
 *   - 데이터 스키마 (ITEM)
 *     {
 *       id: string,           // 고유 ID (내부 식별용)
 *       type: 'game'|'guide', // 항목 종류 (필터에 사용)
 *       title: string,        // 카드 제목
 *       desc?: string,        // 카드 설명
 *       href?: string|null,   // 게임 페이지 링크 (guide 인 경우 보통 없음)
 *       icon?: string,        // 카드 상단 아이콘 이모지
 *       tags?: string[],      // 검색/태깅 용도
 *       template?: string     // guide 인 경우, 모달에 넣을 <template> ID
 *     }
 *   - 공개 메서드 (window.MGH)
 *     - addItem(item): 항목 추가 후 재렌더링
 *     - filter(type): 필터 적용 후 재렌더링
 *   - 키보드 단축키
 *     - '/': 검색창 포커스, 'B': 사이드바 토글(모바일 우선), 'Esc': 모달 닫기
 */

// Data: add your games and guides here
const ITEMS = [
	{
		id: 'maze',
		type: 'game',
		title: 'Maze Escape',
		desc: 'Find your way to the exit. WASD to move.',
		href: 'maze.html',
		icon: '🧩',
		tags: ['puzzle', 'wasd'],
	},
	{
		id: 'shooter',
		type: 'game',
		title: 'Simple Shooting Game',
		desc: 'Dodge and level up. WASD + auto fire.',
		href: 'ShootingGame.html',
		icon: '🎯',
		tags: ['action', 'shooter'],
	},
	{
		id: '2048',
		type: 'game',
		title: '2048',
		desc: '같은 숫자를 합쳐 2048을 만들어보세요! 방향키로 조작.',
		href: '2048.html',
		icon: '🔢',
		tags: ['puzzle', '2048', 'number'],
	},
		{
			id: 'tetris',
			type: 'game',
			title: 'Tetris',
			desc: 'Falling blocks puzzle. 방향키로 조작, Q/W 회전.',
			href: 'Tetris.html',
			icon: '🟦',
			tags: ['puzzle', 'classic', 'tetris'],
		},
	{
		id: 'guide-add',
		type: 'guide',
		title: 'Add a New Game',
		desc: 'Step-by-step to register your own game page.',
		icon: '🛠️',
		template: 'tpl-guide-add',
		tags: ['guide', 'docs'],
	},
	{
		id: 'coming',
		type: 'game',
		title: 'Coming Soon',
		desc: 'Placeholder for the next mini game.',
		href: null,
		icon: '🚧',
		tags: ['coming-soon'],
	},
];

// 내부 상태 (검색어, 필터)
const state = {
	query: '',
	filter: 'all',
};

/** 짧은 선택자 유틸 */
function $(sel, root=document) { return root.querySelector(sel); }
function $all(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }

/**
 * 카드 목록을 현재 state(query, filter)에 맞게 렌더링합니다.
 * - 클릭 이벤트는 data-action, data-id 속성으로 라우팅합니다.
 */
function renderCards() {
	const wrap = $('#cards');
	if (!wrap) return;
	const q = state.query.trim().toLowerCase();
	const matches = (item) => {
		if (state.filter !== 'all' && item.type !== state.filter) return false;
		if (!q) return true;
		const hay = [item.title, item.desc, (item.tags||[]).join(' ')].join(' ').toLowerCase();
		return hay.includes(q);
	};

	const filtered = ITEMS.filter(matches);
	wrap.innerHTML = filtered.map(cardHTML).join('') || emptyState();

	// bind buttons
	$all('.card [data-action]').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const id = e.currentTarget.getAttribute('data-id');
			const action = e.currentTarget.getAttribute('data-action');
			handleCardAction(action, id);
		});
	});
}

/** 검색/필터 결과가 없을 때 보여줄 뷰 */
function emptyState() {
	return `
	<div style="grid-column: 1 / -1; padding: 24px; text-align:center; color:#9aa4b2;">
		No results. Try another search or filter.
	</div>`;
}

/** 단일 카드의 HTML 마크업을 생성합니다. */
function cardHTML(item) {
	const disabled = !item.href;
	return `
	<article class="card" data-type="${item.type}">
		<div class="thumb">${item.icon || '🎮'}</div>
		<div class="body">
			<h3>${item.title}</h3>
			<p>${item.desc || ''}</p>
			<div class="tags">${(item.tags||[]).map(t => `<span class="tag">#${t}</span>`).join('')}</div>
			<div class="actions">
				${item.type === 'guide' && item.template ? `
					<button class="secondary-btn" data-action="open-template" data-id="${item.id}">Open</button>
				` : `
					<a class="primary-btn ${disabled ? 'disabled' : ''}" ${disabled ? 'aria-disabled="true" tabindex="-1"' : `href="${item.href}"`}>
						${disabled ? 'Coming Soon' : 'Open'}
					</a>
				`}
				<button class="secondary-btn" data-action="details" data-id="${item.id}">Details</button>
			</div>
		</div>
	</article>`;
}

/** 카드의 버튼 동작을 처리합니다. */
function handleCardAction(action, id) {
	const item = ITEMS.find(x => x.id === id);
	if (!item) return;
	if (action === 'open-template' && item.template) {
		openModal(item.title, getTemplateHTML(item.template));
	} else if (action === 'details') {
		const html = `
			<p><strong>Type:</strong> ${item.type}</p>
			<p>${item.desc || ''}</p>
			<p><strong>Tags:</strong> ${(item.tags||[]).map(t=>`#${t}`).join(' ')}</p>
			${item.href ? `<p><a href="${item.href}">Open page</a></p>` : ''}
		`;
		openModal(item.title, html);
	}
}

/** template 요소의 내용을 문자열로 가져옵니다. */
function getTemplateHTML(id) {
	const tpl = document.getElementById(id);
	return tpl ? tpl.innerHTML : '<p>Not found.</p>';
}

// Modal
/** 모달 열기 */
function openModal(title, html) {
	const modal = $('#modal');
	$('#modalTitle').textContent = title;
	$('#modalBody').innerHTML = html;
	modal.classList.remove('hidden');
}
/** 모달 닫기 */
function closeModal() {
	$('#modal').classList.add('hidden');
}

// Wire events
/**
 * 초기 UI 이벤트를 바인딩하고 첫 렌더링을 수행합니다.
 * - 검색 인풋: input 이벤트
 * - 네비게이션: data-filter, data-action 처리
 * - 모달: 배경/버튼으로 닫기
 * - 사이드바: 모바일 토글
 * - 키보드: '/', 'B', 'Esc'
 */
function initUI() {
	// search
	const input = $('#searchInput');
	input?.addEventListener('input', (e) => { state.query = e.target.value; renderCards(); });

	// nav filter
	$all('.nav-item').forEach(a => {
		a.addEventListener('click', (e) => {
			e.preventDefault();
			const f = a.getAttribute('data-filter');
			const action = a.getAttribute('data-action');
			if (action === 'open-about') {
				openModal('About', getTemplateHTML('tpl-about'));
				return;
			}
			if (!f) return;
			state.filter = f;
			$all('.nav-item').forEach(n => n.classList.toggle('active', n === a));
			renderCards();
		});
	});

	// modal controls
	$all('[data-action="close-modal"]').forEach(btn => btn.addEventListener('click', closeModal));
	$('#modal')?.addEventListener('click', (e) => {
		if (e.target.matches('.modal-backdrop')) closeModal();
	});

	// top actions
	$('#aboutBtn')?.addEventListener('click', () => openModal('About', getTemplateHTML('tpl-about')));
	$('#shortcutsBtn')?.addEventListener('click', () => openModal('Shortcuts', getTemplateHTML('tpl-shortcuts')));

	// sidebar toggle (mobile)
	const sidebar = $('#sidebar');
	$('#openSidebar')?.addEventListener('click', () => sidebar.classList.add('open'));
	$('#closeSidebar')?.addEventListener('click', () => sidebar.classList.remove('open'));

	// keyboard shortcuts
	window.addEventListener('keydown', (e) => {
		if (e.key === '/' && document.activeElement !== $('#searchInput')) {
			e.preventDefault(); $('#searchInput')?.focus(); return;
		}
		if (e.key.toLowerCase() === 'b') {
			const isOpen = sidebar.classList.contains('open');
			sidebar.classList.toggle('open', !isOpen);
		}
		if (e.key === 'Escape') closeModal();
	});

	// theme toggle (simple) – you can enhance later
	$('#toggleTheme')?.addEventListener('click', () => {
		document.body.classList.toggle('light');
	});

	renderCards();
}

document.addEventListener('DOMContentLoaded', initUI);

	// Optional: 외부에서 사용할 수 있는 최소한의 API 노출
window.MGH = {
	addItem: (item) => { ITEMS.push(item); renderCards(); },
	filter: (type) => { state.filter = type; renderCards(); },
};
