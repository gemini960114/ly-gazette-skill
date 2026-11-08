var util = {

    getData: async function (sectionProp) {
        if (!sectionProp) {
            // no such session info
            console.warn(`no session info`)
            return;
        }

        // get filter criteria
        // let filterQueryString = this.filterQueryString(sectionProp.criteria);
        let endpointRoot = apiEndpointRoot || './api/v1/';

        let filterQueryString = this.queryString(sectionProp.criteria),
            endpoint = `${endpointRoot}${sectionProp.api}?size=${sectionProp.pageSize}&page=${sectionProp.page}&sortCode=${sectionProp.sort}${sectionProp.order}&${filterQueryString}`;
        return new Promise((resolve, reject) => {
            axios.get(endpoint)
                .then(function ({data}) {
                    resolve(data);
                })
                .catch(function (error) {
					let myMap = {
						"totalItems":"0",
						"currentPage":"0",
						"totalPages":"0",
						"items":[]
					};
					let emptyArray =[]; 
                    resolve(myMap);
                });
        });
    },

   getExportData: async function (sectionProp) {
        if (!sectionProp) {
            // no such session info
            console.warn(`no session info`)
            return;
        }

        // get filter criteria
        // let filterQueryString = this.filterQueryString(sectionProp.criteria);
        let endpointRoot = apiEndpointRoot || './api/v1/';

        let filterQueryString = this.queryString(sectionProp.criteria),
            endpoint = `${endpointRoot}${sectionProp.api}?size=${sectionProp.pageSize}&page=${sectionProp.page}&sortCode=${sectionProp.sort}${sectionProp.order}&${filterQueryString}`;
   
       window.location=endpoint;

    },

    queryString: function(criteria) {
        var criterion = [];
        for (var k in criteria){
            if (typeof criteria[k] !== 'function') {
                let c = criteria[k];

                if (c === undefined || c === null) {
                    continue;
                }

                if(typeof c === 'string') {
                    // trim and test if the criteria is empty
                    c = c.replace(/^\s+|\s+$/g, '');
                    if(c.length === 0) {
                        // skip if the criteria is empty
                        continue;
                    }
                } else if(Array.isArray(c)) {
                    if(c.length === 0) {
                        continue;
                    }
                }

                if(typeof c === 'string' && this.validDateValue(c)) {
                    // get formatted date
                    // console.log(k, c);
                    c = this.getFormattedDate(c);
                }

                criterion.push(k + '=' + c);
            }
        }
        return encodeURI(criterion.join('&'));
    },

    validDateValue: function (str) {
        return (str.match(/(\d{4})(\/|-)((\d)|(1[0-2]|0\d))(\/|-)((\d)|([0-2]\d|3[0-1]))/)) && (new Date(str) !== "Invalid Date") && !isNaN(new Date(str));
    },

    getFormattedDate(str) {
        const date = new Date(str);
        return (date.getFullYear()-1911) + '/' + (date.getMonth() + 1) + '/' + date.getDate();
    },

    /**
     * check has the criteria in the obj
     * @param obj
     * @returns {boolean}
     */
    hasCriteria: function (obj) {
        return (typeof (obj) != 'undefined' && obj.length > 0);
    },

    /**
     * 進階搜尋用：criteria 是否至少有一項有效條件（字串非空白、陣列非空、或數字非 0）。
     *
     * 注意：`queryType`/`flag` 屬於「搜尋模式或系統旗標」，不算使用者輸入條件。
     */
    hasAnySearchCriteria: function (criteria) {
        if (!criteria || typeof criteria !== 'object') return false;
        for (var k in criteria) {
            if (!Object.prototype.hasOwnProperty.call(criteria, k)) continue;
            if (typeof criteria[k] === 'function') continue;
            var v = criteria[k];
            if (v === undefined || v === null) continue;
            if (k === 'queryType' || k === 'flag') {
                continue;
            }
            if (Array.isArray(v)) {
                if (v.length > 0) return true;
            } else if (typeof v === 'string') {
                if (v.replace(/^\s+|\s+$/g, '').length > 0) return true;
            } else if (typeof v === 'number' && !isNaN(v)) {
                if (v !== 0) return true;
            }
        }
        return false;
    },

    /**
     * get date range by giving range and unit(e.g.: weeks,months,years)
     * @param range
     * @param unit
     * @returns {*[]}
     */
    getDateRange(range, unit) {
        return [
            (moment().subtract(range, unit).format('YYYY/MM/DD').substr(0,4)-1911)+moment().subtract(range, unit).format('YYYY/MM/DD').substr(4).toString(),
           (moment().format('YYYY/MM/DD').substr(0,4)-1911)+moment().format('YYYY/MM/DD').substr(4).toString()
        ];
    },


    /**
     * reset all criteria
     * @param criteria criteria object
     */
    clearCriteria(criteria) {
        for (var i in criteria) {
            criteria[i] = Array.isArray(criteria[i]) ? [] : '';
        }
    },

    /**
     * reset all criteria
     * @param criteria criteria object
     */
    clearCriteriaWithoutKeyword(criteria) {
        for (var i in criteria) {
			if(i!='keyword'){
		            criteria[i] = Array.isArray(criteria[i]) ? [] : '';
			}
        }
    },

    /**
     * toggle the selected button with id
     * @param obj
     * @param prop
     * @param id
     */
    toggle: function (obj, prop, id) {
        if (!Array.isArray(obj[prop])) {
            obj[prop] = [];
        }

        if (obj[prop].includes(id)) {
            obj[prop].splice(obj[prop].indexOf(id), 1);
        } else {
            obj[prop].push(id);
        }
    },

    /**
     * toggle the selected button with id
     * @param obj
     * @param prop
     * @param id
     */
    toggleOnlyOne: function (obj, prop, id) {     
		if(prop=='year'){
			obj.termSessionPeriod='';
			obj.sittingUnit2='';
			obj.sittingCategory2='';
		}else if(prop=='termSessionPeriod'){
			obj.year='';
			obj.sittingUnit2='';
			obj.sittingCategory2='';
		}else if(prop=='sittingUnit2'){
			obj.year='';
			obj.termSessionPeriod='';
			obj.sittingCategory2='';
		}else if(prop=='sittingCategory2'){
			obj.year='';
			obj.termSessionPeriod='';
			obj.sittingUnit2='';
		}
		
        if (obj[prop].includes(id)) {
            obj[prop] = [];
        } else {
			obj[prop] = [];
            obj[prop].push(id);
        }
    },

    /**
     * check if the button id is toggled
     * @param obj
     * @param prop
     * @param id
     * @returns {*}
     */
    isToggled: function (obj, prop, id) {
        return Array.isArray(obj[prop]) && obj[prop].includes(id);
    },



}
