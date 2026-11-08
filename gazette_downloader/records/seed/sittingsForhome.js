Vue.config.devtools = true;
var SittingApp = new Vue({
    el: '#sittings',
    data: {

        isLoading: false,
 		isSubscribeModalVisible: false,
        isModalVisibles: {
            0: false,  // 公報
            1: false,
            2: false,
            3: false,
            4: false,
            5: false,
        },


        props: [
            new SectionProperty({criteria: new Sitting0FilterCriteria()}),  // 0:所有會議
            new SectionProperty({api:'meeting-card-1'}),  // 1:院會
            new SectionProperty({api:'meeting-card-2'}),  // 2:常設委員會
            new SectionProperty({api:'meeting-card-3'}),  // 3:黨團協商
            new SectionProperty({api:'meeting-card-4'}),  // 4:特種委員會
            new SectionProperty({api:'meeting-card-5'}),  // 5:其他
            new SectionProperty({api:'meeting-card-6'}),  // 6:全院委員會
        ],

        selectedSubTypeCodes: {
            meeting2: '-1',
            meeting4: '-1'
        },

        options: {
            sittingCategories: [],  // 會議類別
            sittingUnits: [],   // 會議單位
        },

    },
    methods: {
        subCodeChange: async function (subCode, section) {
            if (typeof this.props[section]['criteria']['sub-code-id'] != 'undefined') {
                this.props[section]['criteria']['sub-code-id'] = subCode;
                this.props[section].data = await util.getData(this.props[section]);
            }
        },

        pageSizeChange: async function (pageSize, section) {
            this.props[section].pageSize = pageSize;
            await this.reloadData(section);
        },

        sortChange: async function (sort, section) {
            this.props[section].sort = sort;
            await this.reloadData(section);
        },

        orderChange: async function (order, section) {
            this.props[section].order = order;
            await this.reloadData(section);
        },

        pageChange: async function (page, section) {
            this.props[section].page = page;
            this.props[section].data = await util.getData(this.props[section]);
        },

        reloadData: async function(section) {
            this.props[section].page = 1;
            this.props[section].data = await util.getData(this.props[section]);
        },

        getData: async function () {
            for (let i = 0; i < this.props.length; i++) {
                let sectionProp = this.props[i];
                if (!sectionProp) {
                    // no such session info
                    console.warn(`no [${session}] session info`)
                    return;
                }

                this.props[i].data = await util.getData(sectionProp);
            }
        },

        // for searching modal
        showModal(idx) {
            this.isModalVisibles[idx] = true;
			$(this.$refs.sittingsModal.$el).modal('show'); 
        },

        closeModal(idx) {
            this.isModalVisibles[idx] = false;
			$(this.$refs.sittingsModal.$el).modal('hide'); 
			$('#sittingModalButton').focus();
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

        getFormattedDate(date) {
            return (date.getFullYear() - 1911) + '/' + (date.getMonth() + 1).toString().padStart(2, '0') + '/' + date.getDate().toString().padStart(2, '0');
        },

        getOptions: function () {
            let self = this;

            // 會議類別
//            axios
//                .get(`./api/v1/sitting-info/sitting-category`)
//                .then(resp => self.options.sittingCategories = resp.data.items);

				self.options.sittingCategories =[
										    '一般會議',
										    '黨團協商',
										    '公聽會',
										    '考察',
										    '其他' ];

            // 會議單位
            axios
                .get(`./api/v1/sitting-info/sitting-unit`)
                .then(resp => self.options.sittingUnits = resp.data.items);
        },
	  goSearch() {
					let queryString="";
					
					for(i=0;Object.entries(this.props[0].criteria).length>i;i++){
						if(Object.entries(this.props[0].criteria)[i][0]!='sittingCategory'&&Object.entries(this.props[0].criteria)[i][0]!='sittingUnit'&&Object.entries(this.props[0].criteria)[i][1]!=''){
							queryString+=("&criteria="+Object.entries(this.props[0].criteria)[i][0]+"&value="+Object.entries(this.props[0].criteria)[i][1]);
						} else if ((Object.entries(this.props[0].criteria)[i][0]=='sittingCategory'||Object.entries(this.props[0].criteria)[i][0]=='sittingUnit')&&Object.entries(this.props[0].criteria)[i][1]!=''){
							for(j=0;Object.entries(this.props[0].criteria)[i][1].length>j;j++){
							queryString+=("&criteria="+Object.entries(this.props[0].criteria)[i][0]+"&value="+Object.entries(this.props[0].criteria)[i][1][j]);
							}
						}
					}

						window.open('/ppg/sittings/search?'+queryString);
		},
    },
    async created() {
        this.loading = false;


        this.props[0].selectedDate = new Date();
        this.props[1].selectedDate = new Date();
        this.props[2].selectedDate = new Date();
        this.props[2].criteria = {"sub-code-id": -1};
        this.props[3].selectedDate = new Date();
        this.props[4].selectedDate = new Date();
        this.props[4].criteria = {"sub-code-id": -1};
		this.props[5].selectedDate = new Date();

//	if(this.props[0].criteria['startDate']==''&&this.props[0].criteria['endDate']==''&&this.props[0].criteria['keyword']==''){
//			[this.props[0].criteria['startDate'],this.props[0].criteria['endDate']]=util.getDateRange(1, 'months');
//		}
		
        // 首頁載入不預先打會議清單 API（避免無條件掃資料/造成多餘請求）
        // 需要資料時再由使用者切換分頁或操作時觸發 reloadData。
        // this.getData();
        // get options for modal
        await this.getOptions();


    },
    components: {
        paginate: MisqPaginate,
    },
});
