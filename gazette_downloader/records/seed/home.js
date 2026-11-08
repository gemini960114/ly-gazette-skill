Vue.config.devtools = true;
var app = new Vue({
    el: '#home',
    data: {
	    morePublication: {  text:'公報',
							textValue:0 },							
		placeholderWord:'關鍵字',
        isLoading: false,
		isSubscribeModalVisible: false,
 		isModalVisible: false,
					  // input value
                        billSearchValue: '',

                        // search result in bills
                        results: [],

                        // auto suggest is opened
                        isOpen: false,

                        // selected bill in auto suggest
                        currentlyBill: -1,

                        // bills from remote by keyword
                        bills: [],
        props: {
            'bill0': new SectionProperty({}), // 0:所有議案
            'bill1': new SectionProperty({}),                   // 1:熱門焦點議案
            'bill2': new SectionProperty({api: 'latest-pass-third-reading',pageSize:"-1", sort: "1",order:"1",criteria: new Bill0FilterCriteria()}),   // 2:最新通過三讀
            'bill3': new SectionProperty({api: 'latest-second-reading',pageSize:"-1", sort: "1",order:"0"}),           // 3:最新院會討論事項
          	'bill4': new SectionProperty({api: 'exercises-the-power-of-consent',pageSize:"-1", sort: "1",order:"1"}),  // 4:同意權行使
            'bill5': new SectionProperty({api: 'deliver-and-negotiation',pageSize:"-1", sort: "1",order:"1"}),          // 5:交付協商
            'bill6': new SectionProperty({api: 'latest-yuan-announcements',pageSize:"-1", sort: "1",order:"0"}),         // 6:最新院會報告事項
			'bill7': new SectionProperty({api: 'latest-yuan-announcementsAdd',pageSize:"-1", sort: "1",order:"0"}),         // 7:最新院會報告事項(增列)
            'publication1': new SectionProperty({api: 'publication', sort: -1, pageSize: -1, criteria: new Publication0FilterCriteria()}),         // 公報
            'publication2': new SectionProperty({api: 'publication2', sort: -1, pageSize: -1, criteria: new Publication1FilterCriteria()}),         // 議事日程
            'publication3': new SectionProperty({api: 'publication3', sort: -1, pageSize: -1, criteria: new Publication2FilterCriteria()}),         // 議事錄
            'publication4': new SectionProperty({api: 'publication4', sort: -1, criteria: new Publication3FilterCriteria()}),         // 國是論壇
            'publication5': new SectionProperty({api: 'publication5', sort: -1}),         // 立法院素紀錄
            'publication6': new SectionProperty({api: 'publication6', sort: -1}),         // 國民政府時期
            'publication7': new SectionProperty({api: 'agenda-draft', sort: -1, pageSize: -1, criteria: new Publication6FilterCriteria()}),         // 議事日程草案
            'publication8': new SectionProperty({api: 'official-gazettes-draft', sort: "1", pageSize: -1, pageSize: -1, criteria: new Publication7FilterCriteria()}),         // 公報初稿
            'meeting0': new SectionProperty({api: 'all-sittings', sort: -1, pageSize: -1, criteria: new Sitting0FilterCriteria()}),         // 所有會議
            'meeting1': new SectionProperty({api: 'meeting-card-1', sort: -1, pageSize: -1, criteria: new Sitting1FilterCriteria()}),         // 院會
            'meeting2': new SectionProperty({api: 'meeting-card-2', sort: -1, pageSize: -1, criteria: new Sitting2FilterCriteria()}),         // 常設委員會
            'meeting3': new SectionProperty({api: 'meeting-card-3', sort: -1, pageSize: -1, criteria: new Sitting3FilterCriteria()}),         // 黨團協商
            'meeting4': new SectionProperty({api: 'meeting-card-4', sort: -1, pageSize: -1, criteria: new Sitting4FilterCriteria()}),         // 特種委員會
            'meeting5': new SectionProperty({api: 'meeting-card-5', sort: -1, pageSize: -1, criteria: new Sitting4FilterCriteria()}),         // 其他會議
            'meeting6': new SectionProperty({api: 'meeting-card-6', sort: -1, pageSize: -1, criteria: new Sitting4FilterCriteria()}),         // 全院委員會
        	'allBillsSearch': new SectionProperty({api:'all-bills', criteria: new Bill0FilterCriteria(), sort: "1",order:"1"}), // 0:所有議案
		},
		 options: {
            billTypes: [], // 院總細目
            proposalTypes: [], // 提案來源
            oldProposalTypes: [], // 提案來源
            billActions: [], // 議案進度
            agendaTypes: [], // 議程類別
            committees: [], // 委員會
            proposers: [], // 提案人
            petitions: [], // 連署人
            agendaTypePendings: [], // 議案類別
        },
        
        today: new Date(),

        calendarProps: {
            meeting0: new CalendarProperty({api: 'sitting-date', criteria: { sittingType: 'ALL', sittingUnit: '-1'}}),
            meeting1: new CalendarProperty({api: 'sitting-date', criteria: { sittingType: 'YuanSittings', sittingUnit: '-1'}}),
            meeting2: new CalendarProperty({api: 'sitting-date', criteria: { sittingType: 'Committees', sittingUnit: '-1'}}),
            meeting3: new CalendarProperty({api: 'sitting-date', criteria: { sittingType: 'ConsultAmongPoliticalParties', sittingUnit: '-1'}}),
            meeting4: new CalendarProperty({api: 'sitting-date', criteria: { sittingType: 'OtherSittings', sittingUnit: '-1'}}),
            meeting5: new CalendarProperty({api: 'sitting-date', criteria: { sittingType: 'OtherSittings2', sittingUnit: '-1'}}),
            meeting6: new CalendarProperty({api: 'sitting-date', criteria: { sittingType: 'TheCommitteeOfTheWholeYuan', sittingUnit: '-1'}}),
            pub1: new CalendarProperty({api: 'publications-date', criteria: { publicationTypeEnum: 'OfficialGazettes'}}),
            pub2: new CalendarProperty({api: 'publications-date', criteria: { publicationTypeEnum: 'Agenda'}}),
            pub3: new CalendarProperty({api: 'publications-date', criteria: { publicationTypeEnum: 'Proceedings'}}),
            pub4: new CalendarProperty({}),
            pub5: new CalendarProperty({}),
            pub6: new CalendarProperty({}),
            pub7: new CalendarProperty({api: 'publications-date', criteria: { publicationTypeEnum: 'AgendaDraft'}}),
            pub8: new CalendarProperty({api: 'publications-date', criteria: { publicationTypeEnum: 'OfficialGazettesDraft'}})
        },

        // selected submenu item
        selectedSubmenus: {
            bill: 2,
            publication: 0,
            meeting: 0,
        },

        //公報子選單
        publicationSubmenus: {
            0: 'publication1',   // submenus of 公報
            1: 'publication2'    // submenu of 議事日程
        },

        quickDates: {
            OfficialGazettes: '',
            Agenda: '',
            Proceedings: '',
            AgendaDraft: '',
            OfficialGazettesDraft: '',
        }

    },
    methods: {
	morePublicationFunction(e){
		if(e=='0'){
			this.morePublication.text='公報';
			this.morePublication.textValue=0;
		}else if(e=='1'){
			this.morePublication.text='議事日程';
			this.morePublication.textValue=1;
		}else if(e=='2'){
			this.morePublication.text='議事錄';
			this.morePublication.textValue=2;
		}else{
			this.morePublication.text='';
		}
	},
	rememberReturnTarget(targetId) {
		// 相容舊呼叫：預設代表「跳到會議區塊(accesskey_l)」的返回目標
		this.rememberReturnTargetFor('accesskey_l', targetId);
	},
	rememberReturnTargetFor(anchorId, targetId) {
		// 記錄「跳到下一區塊」的來源，供 Shift+Tab 返回使用（各區塊各記一份）
		if (!this._returnTargets) this._returnTargets = {};
		this._returnTargets[anchorId] = targetId;
	},
	focusReturnTargetOrActiveTab(anchorId) {
		const targets = this._returnTargets || {};
		const targetId = targets[anchorId];
		if (targetId) {
			const el = document.getElementById(targetId);
			delete targets[anchorId];
			if (el && typeof el.focus === 'function') {
				el.focus();
				return true;
			}
		}

		// fallback：回到上一區塊「目前選中的頁籤」
		if (anchorId === 'accesskey_l') {
			const tablist = document.getElementById('pills-bill');
			const active = tablist && this.getActiveTabInList(tablist);
			if (active && typeof active.focus === 'function') {
				active.focus();
				return true;
			}
		}
		if (anchorId === 'accesskey_p') {
			const tablist = document.getElementById('pills-sitting');
			const active = tablist && this.getActiveTabInList(tablist);
			if (active && typeof active.focus === 'function') {
				active.focus();
				return true;
			}
		}
		if (anchorId === 'z') {
			const tablist = document.getElementById('pills-pub');
			const active = tablist && this.getActiveTabInList(tablist);
			if (active && typeof active.focus === 'function') {
				active.focus();
				return true;
			}
		}
		return false;
	},
	getVisibleTabs(tablist) {
		if (!tablist) return [];
		return Array.from(tablist.querySelectorAll('[role="tab"]')).filter(
			tab => tab.offsetParent !== null && !tab.disabled
		);
	},
	getTablistExtraFocusables(tablist) {
		if (!tablist) return [];
		return Array.from(tablist.querySelectorAll('a[href], button:not([disabled])')).filter(el => {
			if (el.getAttribute('role') === 'tab' || el.disabled) return false;
			if (el.getAttribute('aria-hidden') === 'true') return false;
			const rects = el.getClientRects();
			return rects.length > 0 && (rects[0].width > 0 || rects[0].height > 0);
		});
	},
	getTablistNavItems(tablist) {
		const tabs = this.getVisibleTabs(tablist);
		const extras = this.getTablistExtraFocusables(tablist);
		const combined = tabs.concat(extras);
		return combined.sort((a, b) => {
			if (a === b) return 0;
			const relation = a.compareDocumentPosition(b);
			if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
			if (relation & Node.DOCUMENT_POSITION_PRECEDING) return 1;
			return 0;
		});
	},
	isTablistNavTarget(target) {
		if (!target || !target.closest) return false;
		const tablist = target.closest('[role="tablist"]');
		if (!tablist || !document.getElementById('home').contains(tablist)) return false;
		if (target.getAttribute('role') === 'tab') return true;
		return this.getTablistExtraFocusables(tablist).includes(target);
	},
	getPanelFocusables(panel) {
		if (!panel) return [];
		return Array.from(panel.querySelectorAll(
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		)).filter(el => {
			if (el.disabled || el.getAttribute('aria-hidden') === 'true') return false;
			const rects = el.getClientRects();
			return rects.length > 0 && (rects[0].width > 0 || rects[0].height > 0);
		});
	},
	moveFocusIntoPanel(tabEl) {
		const panel = this.getTabPanelForTab(tabEl);
		if (!panel) return false;

		const firstCategory = panel.querySelector('.Ur-SecBadges button, .Ur-SecBadges a');
		if (firstCategory && typeof firstCategory.focus === 'function') {
			firstCategory.focus();
			return document.activeElement === firstCategory;
		}

		const focusables = this.getPanelFocusables(panel);
		if (focusables.length && typeof focusables[0].focus === 'function') {
			focusables[0].focus();
			return document.activeElement === focusables[0];
		}
		return false;
	},
	focusToolbarBeforeTablist(tabEl) {
		const tablist = tabEl.closest('[role="tablist"]');
		if (!tablist) return false;

		const section = tablist.closest('section');
		const home = document.getElementById('home');
		if (!section || !home || !home.contains(section)) return false;

		const selector =
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
		const preceding = Array.from(section.querySelectorAll(selector)).filter(el => {
			if (tablist.contains(el) || el.getAttribute('role') === 'tab') return false;
			if (el.closest('[role="tabpanel"]') || el.closest('.tab-content')) return false;
			if (el.disabled || el.getAttribute('aria-hidden') === 'true') return false;
			const rects = el.getClientRects();
			if (!rects.length || (rects[0].width === 0 && rects[0].height === 0)) return false;
			return (tablist.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
		});

		if (!preceding.length) return false;

		const target = preceding[preceding.length - 1];
		target.focus();
		return document.activeElement === target;
	},
	getTabPanelForTab(tabEl, requireVisible) {
		if (!tabEl || !tabEl.getAttribute) return null;
		const targetSelector =
			tabEl.getAttribute('data-bs-target') ||
			(tabEl.getAttribute('aria-controls') ? ('#' + tabEl.getAttribute('aria-controls')) : '');
		if (!targetSelector) return null;
		const panel = document.querySelector(targetSelector);
		if (!panel) return null;
		if (requireVisible !== false &&
			!(panel.classList.contains('active') || panel.classList.contains('show'))) {
			return null;
		}
		return panel;
	},
	activateTab(tabEl) {
		if (!tabEl) return;
		tabEl.click();
	},
	getActiveTabInList(tablist) {
		const tabs = this.getVisibleTabs(tablist);
		return tabs.find(tab => tab.classList.contains('active')) || tabs[0] || null;
	},
	focusAdjacentTab(navEl, direction) {
		const tablist = navEl.closest('[role="tablist"]');
		const items = this.getTablistNavItems(tablist);
		if (!items.length) return null;

		let index = items.indexOf(navEl);
		if (index === -1) index = 0;

		const offset = direction === 'next' ? 1 : -1;
		const next = items[(index + offset + items.length) % items.length];
		if (!next) return null;

		if (next.getAttribute('role') === 'tab' && !next.classList.contains('active')) {
			this.activateTab(next);
		}
		this.$nextTick(() => {
			next.focus();
		});
		return next;
	},
	focusTabPanelContent(tabEl) {
		if (!tabEl.classList.contains('active')) {
			this.activateTab(tabEl);
		}
		const vm = this;
		const attempt = function (retries) {
			if (vm.moveFocusIntoPanel(tabEl)) return;
			if (retries > 0) {
				vm.$nextTick(() => attempt(retries - 1));
			}
		};
		attempt(3);
	},
	focusActiveTabInPanel(panel) {
		if (!panel) return;

		let tab = null;
		const labelledBy = panel.getAttribute('aria-labelledby');
		if (labelledBy) {
			tab = document.getElementById(labelledBy);
		}
		if (!tab && panel.id) {
			tab = document.querySelector(
				'[role="tab"][aria-controls="' + panel.id + '"], [role="tab"][data-bs-target="#' + panel.id + '"]'
			);
		}
		if (!tab) {
			const tabContent = panel.closest('.tab-content');
			let navTablist = null;
			if (tabContent) {
				if (tabContent.id === 'pills-tabContent') navTablist = document.getElementById('pills-bill');
				else if (tabContent.id === 'pills-sittingContent') navTablist = document.getElementById('pills-sitting');
				else if (tabContent.id === 'pills-publication-tab-content') navTablist = document.getElementById('pills-pub');
			}
			if (navTablist && panel.id) {
				tab = navTablist.querySelector('[role="tab"].active') ||
					navTablist.querySelector('[role="tab"][aria-controls="' + panel.id + '"]');
			}
		}
		if (tab && typeof tab.focus === 'function') {
			tab.focus();
		}
	},
	focusNextTabFromPanel(panel) {
		if (!panel) return false;

		const tabContent = panel.closest('.tab-content');
		if (!tabContent) return false;

		let tablist = null;
		if (tabContent.id === 'pills-tabContent') tablist = document.getElementById('pills-bill');
		else if (tabContent.id === 'pills-sittingContent') tablist = document.getElementById('pills-sitting');
		else if (tabContent.id === 'pills-publication-tab-content') tablist = document.getElementById('pills-pub');
		if (!tablist) return false;

		// 注意：公報區有「公報大事紀」這類非 role="tab" 的可聚焦按鈕
		// 若只抓 role="tab" 會導致「走完最後一個面板」時不會跳到它
		const navItems = this.getTablistNavItems(tablist);
		if (!navItems.length) return false;

		const activeTab = this.getActiveTabInList(tablist);
		const currentIndex = Math.max(0, navItems.indexOf(activeTab));
		const nextItem = navItems[currentIndex + 1];
		if (!nextItem) return false;

		const nextIsTab = nextItem.getAttribute && nextItem.getAttribute('role') === 'tab';
		if (nextIsTab) {
			if (!nextItem.classList.contains('active')) {
				this.activateTab(nextItem);
			}
			this.$nextTick(() => {
				// 直接把焦點帶進下一個面板，符合「跑完一區 → 進入下一區」的閱讀順序
				if (!this.moveFocusIntoPanel(nextItem)) {
					nextItem.focus();
				}
			});
			return true;
		}

		// nextItem 是 tablist 裡的額外可聚焦項（例如「公報大事紀」），直接 focus 即可
		if (typeof nextItem.focus === 'function') {
			nextItem.focus();
		}
		return true;
	},
	onTabClick(e) {
		// 滑鼠點選頁籤僅切換內容，不自動把焦點移入面板（避免重複 click / reload 與焦點被拉走）
	},
	onHomeKeydown(e) {
		const keyCode = e.keyCode || e.which;
		const target = e.target;

		if (keyCode !== 9) return;

		const panel = target.closest && target.closest('[role="tabpanel"]');
		if (!panel || !document.getElementById('home').contains(panel)) return;

		// Tab：當焦點已在面板最後一個可聚焦元素時，導向下一個頁籤/面板（上到下、左到右）
		if (!e.shiftKey) {
			const focusables = this.getPanelFocusables(panel);
			if (focusables.length && focusables[focusables.length - 1] === target) {
				if (this.focusNextTabFromPanel(panel)) {
					e.preventDefault();
					return;
				}

				// 若已是該 tab-content 的最後一個面板，提供「跳到下一大區塊」避免卡在大量卡片中
				const tabContent = panel.closest('.tab-content');
				if (tabContent && tabContent.id === 'pills-tabContent') {
					const nextSectionAccesskey = document.getElementById('accesskey_l'); // 會議區塊
					if (nextSectionAccesskey && typeof nextSectionAccesskey.focus === 'function') {
						const billTablist = document.getElementById('pills-bill');
						const activeBillTab = billTablist && this.getActiveTabInList(billTablist);
						if (activeBillTab && activeBillTab.id) {
							this.rememberReturnTargetFor('accesskey_l', activeBillTab.id);
						}
						e.preventDefault();
						nextSectionAccesskey.focus({ preventScroll: false });
						return;
					}
				} else if (tabContent && tabContent.id === 'pills-sittingContent') {
					const nextSectionAccesskey = document.getElementById('accesskey_p'); // 公報區塊
					if (nextSectionAccesskey && typeof nextSectionAccesskey.focus === 'function') {
						const sittingTablist = document.getElementById('pills-sitting');
						const activeSittingTab = sittingTablist && this.getActiveTabInList(sittingTablist);
						if (activeSittingTab && activeSittingTab.id) {
							this.rememberReturnTargetFor('accesskey_p', activeSittingTab.id);
						}
						e.preventDefault();
						nextSectionAccesskey.focus({ preventScroll: false });
						return;
					}
				} else if (tabContent && tabContent.id === 'pills-publication-tab-content') {
					const footerAccesskey = document.getElementById('z'); // 頁尾
					if (footerAccesskey && typeof footerAccesskey.focus === 'function') {
						const pubTablist = document.getElementById('pills-pub');
						const activePubTab = pubTablist && this.getActiveTabInList(pubTablist);
						if (activePubTab && activePubTab.id) {
							this.rememberReturnTargetFor('z', activePubTab.id);
						}
						e.preventDefault();
						footerAccesskey.focus({ preventScroll: false });
						return;
					}
				}
			}
			return;
		}

		const badges = panel.querySelector('.Ur-SecBadges');
		if (badges && badges.contains(target)) {
			const badgeFocusables = this.getPanelFocusables(badges);
			if (badgeFocusables.length && badgeFocusables[0] === target) {
				e.preventDefault();
				this.focusActiveTabInPanel(panel);
				return;
			}
		}

		const focusables = this.getPanelFocusables(panel);
		if (focusables.length && focusables[0] === target) {
			e.preventDefault();
			this.focusActiveTabInPanel(panel);
		}
	},
	accessibility(e) {
		const key = e.key || '';
		const keyCode = e.keyCode || e.which;
		const isEnter = key === 'Enter' || keyCode === 13;
		const isSpace = key === ' ' || key === 'Spacebar' || keyCode === 32;
		const isTabKey = key === 'Tab' || keyCode === 9;
		const isArrowLeft = key === 'ArrowLeft' || keyCode === 37;
		const isArrowRight = key === 'ArrowRight' || keyCode === 39;
		const target = e.target;

		if (!this.isTablistNavTarget(target)) {
			return;
		}

		// 公報區「公報大事紀」不是 role="tab"：
		// - Shift+Tab：回到同區塊「進階搜尋」等工具列（而不是回到左側上一個 tab）
		// - Tab：往下接頁尾（避免又進入目前 active 的面板內容）
		if (target && target.id === 'pills-publication-chronicle' && isTabKey && e.shiftKey) {
			const pubTab = document.getElementById('pills-publication-tab-1');
			if (pubTab && this.focusToolbarBeforeTablist(pubTab)) {
				e.preventDefault();
				return;
			}
			// fallback：直接回到公報進階搜尋按鈕
			const pubModalBtn = document.getElementById('publicationModalButton');
			if (pubModalBtn && typeof pubModalBtn.focus === 'function') {
				e.preventDefault();
				pubModalBtn.focus();
				return;
			}
		}

		// 公報區「公報大事紀」不是 role="tab"；從它往前 Tab 時，
		// 若不處理，瀏覽器會依 DOM 順序又把焦點帶回目前 active 的面板（例如國民政府時期公報）
		if (target && target.id === 'pills-publication-chronicle' && isTabKey && !e.shiftKey) {
			const footerAccesskey = document.getElementById('z');
			if (footerAccesskey && typeof footerAccesskey.focus === 'function') {
				const pubTablist = document.getElementById('pills-pub');
				const activePubTab = pubTablist && this.getActiveTabInList(pubTablist);
				if (activePubTab && activePubTab.id) {
					this.rememberReturnTargetFor('z', activePubTab.id);
				}
				e.preventDefault();
				footerAccesskey.focus({ preventScroll: false });
			}
			return;
		}

		const isTabRole = target.getAttribute('role') === 'tab';

		if (isArrowLeft || isArrowRight) {
			e.preventDefault();
			this.focusAdjacentTab(target, isArrowRight ? 'next' : 'prev');
			return;
		}

		if (!isTabRole) {
			if (isEnter || isSpace) {
				e.preventDefault();
				this.openPublicationChronicle();
			}
			return;
		}

		if (isTabKey && e.shiftKey) {
			if (this.focusToolbarBeforeTablist(target)) {
				e.preventDefault();
			}
			return;
		}

		if (isTabKey && !e.shiftKey) {
			if (!target.classList.contains('active')) {
				e.preventDefault();
				this.activateTab(target);
				this.$nextTick(() => this.focusTabPanelContent(target));
				return;
			}
			if (this.moveFocusIntoPanel(target)) {
				e.preventDefault();
			}
			return;
		}

		if (isEnter || isSpace) {
			e.preventDefault();
			const wasSelected = target.classList.contains('active');
			if (!wasSelected) {
				this.activateTab(target);
				this.$nextTick(() => this.moveFocusIntoPanel(target));
			} else if (!this.moveFocusIntoPanel(target)) {
				this.$nextTick(() => this.moveFocusIntoPanel(target));
			}
		}
	},
	onGlobalReturnKeydown(e) {
		const keyCode = e.keyCode || e.which;
		if (keyCode !== 9 || !e.shiftKey) return;

		const target = e.target;
		if (!target || !target.id) return;

		if (target.id === 'accesskey_l' || target.id === 'accesskey_p' || target.id === 'z') {
			e.preventDefault();
			this.focusReturnTargetOrActiveTab(target.id);
		}
	},
	onInfoModalHidden() {
		const trigger = this._infoModalTrigger;
		if (trigger && document.contains(trigger) && typeof trigger.focus === 'function') {
			trigger.focus();
		}
		this._infoModalTrigger = null;
	},
	gobackbill(e) {
		if (!e || !e.shiftKey || e.keyCode !== 9) return;

		if (e.target && e.target.id === 'accesskey_l') {
			e.preventDefault();
			this.focusReturnTargetOrActiveTab('accesskey_l');
			return;
		}

		const billTablist = document.getElementById('pills-bill');
		const activeTab = billTablist && this.getActiveTabInList(billTablist);
		if (!activeTab) return;

		e.preventDefault();
		if (!this.focusToolbarBeforeTablist(activeTab)) {
			activeTab.focus();
		}
	},
	focusAccesskeySection(sectionId) {
		const section = document.getElementById(sectionId);
		if (!section) return false;

		if (window.history && typeof window.history.replaceState === 'function') {
			window.history.replaceState(null, '', '#' + sectionId);
		} else {
			window.location.hash = sectionId;
		}
		section.scrollIntoView({ behavior: 'smooth', block: 'start' });
		if (typeof section.focus === 'function') {
			section.focus({ preventScroll: true });
		}
		this._lastAccesskeySection = sectionId;
		this._lastAccesskeyAt = Date.now();
		return document.activeElement === section;
	},
	getHomeAccesskeySectionId(e) {
		if (!e || !e.altKey || e.ctrlKey || e.metaKey) return null;

		const code = e.code || '';
		if (code === 'KeyC' || e.keyCode === 67) return 'section-1';
		if (code === 'KeyL' || e.keyCode === 76) return 'section-2';
		if (code === 'KeyP' || e.keyCode === 80) return 'section-3';

		const key = (e.key || '').toLowerCase();
		if (key === 'c' || key === 'l' || key === 'p') {
			return { c: 'section-1', l: 'section-2', p: 'section-3' }[key];
		}
		return null;
	},
	shouldSkipDuplicateAccesskey(sectionId) {
		return this._lastAccesskeySection === sectionId &&
			this._lastAccesskeyAt &&
			Date.now() - this._lastAccesskeyAt < 400;
	},
	onHomeAccesskeyKeydown(e) {
		const sectionId = this.getHomeAccesskeySectionId(e);
		if (!sectionId) return;

		e.preventDefault();
		e.stopPropagation();
		this.focusAccesskeySection(sectionId);
	},
	onHomeAccesskeyKeyup(e) {
		if (e.repeat) return;
		const sectionId = this.getHomeAccesskeySectionId(e);
		if (sectionId !== 'section-1' || this.shouldSkipDuplicateAccesskey(sectionId)) return;

		e.preventDefault();
		e.stopPropagation();
		this.focusAccesskeySection(sectionId);
	},
        getEventDates(section, selectedMonth) {
            let calendarProp = this.calendarProps[section];
            if (!calendarProp) {
                // no such session info
                console.warn(`no [${section}] section info`)
                return;
            }

            if(!calendarProp.api || calendarProp.api.length === 0) {
                return;
            }

            // 避免首頁 created() 預抓 + calendar 元件 mounted 時的 month-changed 重複打同一個月份
            const monthKey = `${selectedMonth.year}-${('0' + selectedMonth.month).slice(-2)}`;
            const criteriaKey = JSON.stringify(calendarProp.criteria || {});
            const fetchKey = `${monthKey}|${criteriaKey}`;
            if (calendarProp._lastFetchedMonthKey === fetchKey) {
                return;
            }
            calendarProp._lastFetchedMonthKey = fetchKey;

            let endpointRoot = apiEndpointRoot || './api/v1/',
                filterQueryString = util.queryString(calendarProp.criteria);
            axios
                .get(`${endpointRoot}${calendarProp.api}?date=${selectedMonth.year-1911}/${('0' + selectedMonth.month).slice(-2)}&${filterQueryString}`)
                .then((resp) => {
                    calendarProp.setEventDates(resp.data.items);
                })
                .catch((error) => console.log(error));

	 },
		onChange(event) {
			
			if(event.target.value=='startDate'){
				this.placeholderWord='例:111/01/01';
			}else{
				this.placeholderWord='關鍵字';
			}
        },
       changeEventDates(section, selectedMonth) {
		let today = new Date();
		today.setFullYear(selectedMonth.year);
		today.setMonth(selectedMonth.month-1);
		this.calendarProps[section].selectedDate=today;
	 },
        async meetingDateChange(date, obj) {
            if(!obj) {
                return;
            }
            obj.criteria.meetingDate = date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
            obj.data = await util.getData(obj)
        },
        async reloadData(obj) {
            // 重新呼叫 API 造成區塊重繪時，避免鍵盤焦點「掉回 body」
            // （常見於原本有卡片可聚焦，但回來變成查無資料、DOM 被整段替換）
            const previouslyFocused = document.activeElement;
            const billTabContent = document.getElementById('pills-tabContent');

            obj.data = await util.getData(obj);

            this.$nextTick(() => {
                const active = document.activeElement;
                const focusIsLost = !active || active === document.body;
                if (!focusIsLost) return;

                // 優先還原到原本的焦點（若元素仍存在）
                if (previouslyFocused && document.contains(previouslyFocused) && typeof previouslyFocused.focus === 'function') {
                    previouslyFocused.focus();
                    return;
                }

                // 僅議案區 reload 時才 fallback 回議案頁籤；避免會議/公報切換時焦點被拉到議案造成異常
                if (!billTabContent || !previouslyFocused || !billTabContent.contains(previouslyFocused)) {
                    return;
                }

                const currentBillTab = (this.selectedSubmenus && typeof this.selectedSubmenus.bill === 'number')
                    ? this.selectedSubmenus.bill
                    : 2;
                const tabId = `pills-home-tab-${currentBillTab + 1}`;
                const tabBtn = document.getElementById(tabId);
                if (tabBtn && typeof tabBtn.focus === 'function') {
                    tabBtn.focus();
                }
            });
        },
        subCodeChange: async function (subCode, obj) {
            obj.criteria['sub-code-id'] = subCode;
            await this.reloadData(obj);
        },

        getLatestPublicationDates() {
            const self = this;
            axios
                .get(`./api/v1/publications-recent-date`)
                .then((resp) => {
                    // console.log(resp);
                    for (const key in resp.data.items) {
                        const date = resp.data.items[key];

                        var parts = date.match(/(\d{1,4})\/(\d{1,2})\/(\d{1,2})/);
                        if(parts) {
                            // test if the date string is full format
                            var dt = new Date(parseInt(parts[1], 10) + 1911,
                                parseInt(parts[2], 10) - 1,
                                parseInt(parts[3], 10));

                            self.quickDates[key] = dt;
                        }

                    }
                })
                .catch((error) => console.log(error));
        },
 		pageChange: async function (page, obj) {
		
             obj.page = page ;
             obj.data = await util.getData(obj);
            //this.props.section.data = await util.getData(this.props.bill2);
        },
 		pageSizeChange: async function (pageSize, obj) {
            obj.pageSize = pageSize;
            obj.page = 1;
            await this.reloadData(obj);
        },
// for searching modal
        showModal() {
            this.isModalVisible = true;
			$(this.$refs.billModal.$el).modal('show'); 
        },

        closeModal() {
            this.isModalVisible = false;
			$(this.$refs.billModal.$el).modal('hide'); 
			$('#billModalButton').focus();
        },
// for subscribing modal
        showSubscribeModal() {
            // update captcha
            this.$refs.subscribeModal.updateCaptcha();
            this.isSubscribeModalVisible = true;
			$(this.$refs.subscribeModal.$el).modal('show'); 
        },

        closeSubscribeModal() {
            this.isSubscribeModalVisible = false;
			$(this.$refs.subscribeModal.$el).modal('hide'); 
			$('#subscribeButton').focus();
        },
		
		getOptions: function () {
            let self = this;
            let endpointRoot = apiEndpointRoot || './api/v1/';

            // 院總號細目選單清單
            axios
                .get(`${endpointRoot}sitting-info/bill-type`)
                .then(resp => self.options.billTypes = resp.data.items);

            // 提案來源選單清單
            axios
                .get(`${endpointRoot}sitting-info/proposal-type`)
                .then(resp => self.options.proposalTypes = resp.data.items);

            // 提案來源選單清單(舊)
            axios
                .get(`${endpointRoot}sitting-info/proposal-type-old`)
                .then(resp => self.options.oldProposalTypes = resp.data.items);

            // 議案進度
            axios
                .get(`${endpointRoot}sitting-info/bill-action`)
                .then(resp => self.options.billActions = resp.data.items);

            // 議程類別
		      self.options.agendaTypes = {
											 "03": "臨時提案"
		  									};

            // 委員會
             axios
                .get(`${endpointRoot}sitting-info/committee`)
                .then(resp => self.options.committees = resp.data.items);

            // 提案人
            axios
                .get(`${endpointRoot}sitting-info/proposer`)
                .then(resp => self.options.proposers = resp.data.items);

            // 連署人
            axios
                .get(`${endpointRoot}sitting-info/petition`)
                .then(resp => self.options.petitions = resp.data.items);

            // 議案類別
            axios
                .get(`${endpointRoot}sitting-info/agenda-type-pending`)
                .then(resp => self.options.agendaTypePendings = resp.data.items);

        },
		goSearch() {
					let queryString="";
					
					for(i=0;Object.entries(this.props.allBillsSearch.criteria).length>i;i++){
						if(Object.entries(this.props.allBillsSearch.criteria)[i][0]!='agendaType'&&Object.entries(this.props.allBillsSearch.criteria)[i][0]!='committee'&&Object.entries(this.props.allBillsSearch.criteria)[i][1]!=''){
							queryString+=("&criteria="+Object.entries(this.props.allBillsSearch.criteria)[i][0]+"&value="+Object.entries(this.props.allBillsSearch.criteria)[i][1]);
						} else if ((Object.entries(this.props.allBillsSearch.criteria)[i][0]=='agendaType'||Object.entries(this.props.allBillsSearch.criteria)[i][0]=='committee')&&Object.entries(this.props.allBillsSearch.criteria)[i][1]!=''){
							for(j=0;Object.entries(this.props.allBillsSearch.criteria)[i][1].length>j;j++){
							queryString+=("&criteria="+Object.entries(this.props.allBillsSearch.criteria)[i][0]+"&value="+Object.entries(this.props.allBillsSearch.criteria)[i][1][j]);
							}
						}
					}

						window.open('/ppg/bills/search?'+queryString);
		        },
		SittingSearch() {
                  const criteria = $('#SittingCriteria').val();
                  const raw = ($('#SittingCriteriaValue').val() || '').toString();
                  const v = raw.trim();

                  if (!v) {
                      alert('請輸入搜尋文字');
                      return;
                  }

                  // normalize trimmed input back to form
                  $('#SittingCriteriaValue').val(v);

                  if (criteria === "startDate") {
                      if (v.length !== 9) {
                          alert("日期格式錯誤，請輸入正確日期!");
                          return;
                      }
                  }

                  document.sittingsSearchForm.submit();
		        },

	 async filterResults() {

                        let bills = await this.getBills();
                        if (typeof bills != 'undefined' && typeof bills.items != 'undefined') {
                            this.bills = bills.items
                        }

                        var vm = this;

                        // this.results = vm.bills.filter(function (item, index, array) {
                        //     return item.toLowerCase().indexOf(vm.searchValue.toLowerCase()) > -1;
                        // });

                        // empty the result
                        this.results = [];
                        for (const [key, value] of Object.entries(this.bills)) {
                            this.results.push({key: key, value: value});
                            // console.log(`${key}: ${value}`);
                        }


                        // check if the input text in the bill set
                        this.noBill = !this.inBillSet();
                        
						if(this.results.length > 0 && this.billSearchValue==this.results[0].value){
							this.setResult(this.results[0]);
						}
						
                        this.isOpen = this.results.length > 0 && (this.billSearchValue!=this.results[0].value);
                    },
 				 setResult(result) {
                        var vm = this;
                        if (vm.results.length !== 0) {
                            vm.billSearchValue = result.value;
                            vm.searchObj = result;
                        }
                        vm.clearAll();
                    },
                    onArrowDown() {
                        // console.log('onArrowDown');
                        if (this.currentlyBill < this.results.length && this.results.length - 1 > this.currentlyBill) {
                            this.currentlyBill = this.currentlyBill + 1;
                        }
                    },
                    onArrowUp() {
                        // console.log('onArrowUp');
                        if (this.currentlyBill > 0) {
                            this.currentlyBill = this.currentlyBill - 1;
                        }
                    },
                    onEnter() {
                        // console.log('onEnter');
                        var vm = this;
                        if (vm.isOpen) {
                            vm.billSearchValue = vm.results[vm.currentlyBill].value;
                            vm.searchObj = vm.results[vm.currentlyBill];
                        }
                        vm.clearAll();
                    },
                    onEsc() {
                        this.clearAll();
                    },
                    clearAll() {
                        var vm = this;
                        vm.currentlyBill = -1;
                        vm.isOpen = false;
                    },

                    async getBills() {

                        const kw = (this.billSearchValue || '').trim();
                        if (kw.length < 2) {
                            return { items: {} };
                        }

                        // cancel  previous ajax if exists
                        if (this.reqeust) {
                            this.reqeust.cancel();
                        }

                        const prop = new SectionProperty({
                            api: 'bill-searchList',
                            criteria: {keyword: kw}
                        });

                        // creates a new token for upcomming ajax (overwrite the previous one)
                        this.reqeust = axios.CancelToken.source();

                        return await util.getData(prop);
                    },
   				inBillSet() {
                    	 
                    	if(this.billSearchValue == null) {
                    		 return true;
                    	} 
                    	 
                    	if(this.billSearchValue == '') {
                   		 return true;
                   	} 
                   	 
                    	
                        if (this.searchObj == null) {
                            return false;
                        }
                        const vm = this;
                        let bills = this.results.filter(function (item) {
                            return item.value === vm.billSearchValue;
                        });

                        return bills.length > 0;
                    },

		openPublicationChronicle() {
			window.open(
				'https://ppg.ly.gov.tw/ppg/RootPath/download/resources/chronicle/chronicle.pdf',
				'_blank',
				'noopener,noreferrer'
			);
		},
		handleClick(type, e){
			if (e && e.currentTarget) {
				this._infoModalTrigger = e.currentTarget;
			}
			if(type=='1'){
					$('#ddd').html('●提供自第 6 屆起之議案資料<br>(一)最近通過/三讀：顯示 1 年內通過/三讀之議案。<br>(二)最新院會報告事項：顯示最新會次之報告事項。<br>(三)最新院會討論事項：顯示最新會次之討論事項。<br>(四)同意權行使：當屆所有同意權行使之議案。<br>(五)交付協商議案：顯示本屆委員會交黨團協商之議案。<br>●議案明細資料，包含提案委員/單位、議案名稱、關係文書、關聯議案、提案人、連署人、議案狀態、詳細議案流程等。<br>●操作手冊請至首頁下方「網站操作教學說明」下載。<br>');
			}else if(type=='2'){
					$('#ddd').html('●首頁日曆提供近4年院會、全院委員會、常設委員會、特種委員會、黨團協商等會議。若要查詢更早以前之資料(約第8屆起)，請至「更多會議」內查詢。<br>●會議明細資料，包含會議名稱、事由、時間、地點、ivod影音、關係文書、議事錄、公報紀錄、院會表決資料與其他會議相關資料等。其中院會表決資料自第10屆第7會期起提供。<br>●操作手冊請至首頁下方「網站操作教學說明」下載。');
			}else if(type=='3'){
					$('#ddd').html('●首頁日曆提供近4年公報、議事日程與議事錄，並以會議日期的方式提供使用者點選，系統即顯示該會議日期之文書。若要查詢更早以前之資料，請至「更多公報」內查詢。<br>●首頁顯示最近4個會期之國是論壇彙編，以及6筆立法院速紀錄與國民政府時期立法院公報。若要查詢更早以前之資料，請至「更多公報」內查詢。<br>●有關公報、議事日程、議事錄與國是論壇彙編，系統均提供全文檢索功能。<br>●操作手冊請至首頁下方「網站操作教學說明」下載。');
			}
					$('#BBBModal').modal('show');
		},
    },
    created () {
		[this.props.bill2.criteria.startDate,this.props.bill2.criteria.endDate]=util.getDateRange(1, 'years');
        this.reloadData(this.props.bill2);
        this.reloadData(this.props.bill3);
        this.reloadData(this.props.bill4);
        this.reloadData(this.props.bill5);
        this.reloadData(this.props.bill6);
		this.reloadData(this.props.bill7);

        this.props.meeting2.criteria['sub-code-id'] = -1;
        this.props.meeting4.criteria['sub-code-id'] = -1;

        // get latest publication dates
        this.getLatestPublicationDates();


        for(const key in this.calendarProps) {
            this.getEventDates(key, {year:this.today.getFullYear(), month: (this.today.getMonth() + 1)});
        }

		// get options for modal
        this.getOptions();


    },
    mounted() {
        const homeEl = document.getElementById('home');
        if (!homeEl) return;
        homeEl.addEventListener('click', this.onTabClick);
        homeEl.addEventListener('keydown', this.onHomeKeydown);
		// accesskey_l / accesskey_p / z 可能不在 #home 內，統一用 capture 處理 Shift+Tab 返回
		this._onGlobalReturnKeydown = (e) => this.onGlobalReturnKeydown(e);
		document.addEventListener('keydown', this._onGlobalReturnKeydown, true);
        this._onHomeAccesskeyKeydown = (e) => this.onHomeAccesskeyKeydown(e);
        this._onHomeAccesskeyKeyup = (e) => this.onHomeAccesskeyKeyup(e);
        document.addEventListener('keydown', this._onHomeAccesskeyKeydown, true);
        document.addEventListener('keyup', this._onHomeAccesskeyKeyup, true);
        const infoModalEl = document.getElementById('BBBModal');
        if (infoModalEl) {
            this._onInfoModalHidden = () => this.onInfoModalHidden();
            infoModalEl.addEventListener('hidden.bs.modal', this._onInfoModalHidden);
        }
    },
    beforeDestroy() {
        const homeEl = document.getElementById('home');
        if (!homeEl) return;
        homeEl.removeEventListener('click', this.onTabClick);
        homeEl.removeEventListener('keydown', this.onHomeKeydown);
		if (this._onGlobalReturnKeydown) {
			document.removeEventListener('keydown', this._onGlobalReturnKeydown, true);
		}
        if (this._onHomeAccesskeyKeydown) {
            document.removeEventListener('keydown', this._onHomeAccesskeyKeydown, true);
        }
        if (this._onHomeAccesskeyKeyup) {
            document.removeEventListener('keyup', this._onHomeAccesskeyKeyup, true);
        }
        const infoModalEl = document.getElementById('BBBModal');
        if (infoModalEl && this._onInfoModalHidden) {
            infoModalEl.removeEventListener('hidden.bs.modal', this._onInfoModalHidden);
        }
    },
	
 		watch: {
                    billSearchValue() {
                        clearTimeout(this._billSearchTimer);
                        if ($('#BillCriteria').val() != 'keyword') {
                            return;
                        }
                        const kw = (this.billSearchValue || '').trim();
                        if (kw.length < 2) {
                            this.results = [];
                            this.isOpen = false;
                            if (this.reqeust) {
                                this.reqeust.cancel();
                            }
                            return;
                        }
                        this._billSearchTimer = setTimeout(() => {
                            this.filterResults();
                        }, 1500);
                    },
					
       },
    components: {
        calendar: MisqCalendar,
		paginate: MisqPaginate
    }
});

