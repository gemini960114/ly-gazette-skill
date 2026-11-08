// bills filter criteria
let Bill0FilterCriteria = function() {
    this.keyword = '';
    this.startDate = '';
    this.endDate = '';
    this.term = ''; // 屆別
    this.sessionPeriod = ''; // 會期
    this.sessionTimes = ''; // 會次
    this.extraTimes = ''; // 臨時會次
    this.billType = ''; // 院總細目
    this.yuanNo = ''; // 院總細目(舊)
    this.proposalType = ''; // 提案來源
    this.oldProposalType = ''; // 提案來源(舊)
    this.yuanSeq = ''; // 提案號
    this.proposalNo = ''; // 提案號(舊)
    this.billAction = ''; // 議案進度
    this.proposer = ''; // 提案人
    this.petition = ''; // 連署人
    this.agendaType = []; // 議程類別
    this.committee = []; // 委員會

    this.queryType = 0; // 查詢議案類別
    this.issueNumber = ''; // 發文文號
	this.inWordNo = ''; // 行政機關發文文號
	this.proposerFirst = ''; // 第一提案人
	
	this.year=''; //提案年度(分類用)
	this.people=''; //提案委員(分類用)
	this.billType2=''; //提案年度(分類用)
	this.proposalType2=''; //提案年度(分類用)
	this.billAction2=''; //提案年度(分類用)
	this.committee2=''; //提案年度(分類用)
	this.flag=''; //(分類用)

};

// filter criteria for 公報
let Publication0FilterCriteria = function () {
    this.meetingDate = '';  // 會議日期
    this.keyword= '';
    this.startDate= '';     // 會議日期
    this.endDate= '';       // 會議日期
    this.publicationStartDate= '';  // 出版日期
    this.publicationEndDate= '';    // 出版日期
    this.publicationType= []; // 議程類別
    this.sittingMember= ''; // 委員名稱
    this.host= ''; // 委員名稱
    this.term= ''; // 屆別
    this.sessionPeriod= ''; // 會期
    this.sessionTimes= ''; // 會次
	this.extraTimes = ''; // 臨時會次
    this.volumeStart = ''; // 卷
    this.volumeEnd = ''; // 卷
    this.noStart=''; // 期
    this.noEnd=''; // 期
    this.serialNumber=''; // 出版總號
	this.queryType = 0; // 搜尋類別
	this.processStatus= ''; // 處理進度 
	this.sittingType= []; // 議程類別
	this.subtitle=''; // 案由
    this.publicationType2= []; // 議程類別(分類用)
	this.flag=''; //(分類用)
}

// filter criteria for 議事日程
let Publication1FilterCriteria = function () {
    this.meetingDate = '';  // 會議日期
    this.keyword= '';
    this.startDate= '';     // 會議日期
    this.endDate= '';       // 會議日期
    this.sittingType= []; // 議程類別
    this.sittingMember= ''; // 委員名稱
    this.host= ''; // 委員會
    this.term= ''; // 屆別
    this.sessionPeriod= ''; // 會期
    this.sessionTimes= ''; // 會次
    this.extraTimes= ''; // 臨時會次
}

// filter criteria for 議事錄
let Publication2FilterCriteria = function () {
    this.meetingDate = '';  // 會議日期
    this.keyword= '';
    this.startDate= '';     // 會議日期
    this.endDate= '';       // 會議日期
    this.publicationType= []; // 會議類別
    this.processStatus= ''; // 處理進度 
    this.term= ''; // 屆別
    this.sessionPeriod= ''; // 會期
    this.sessionTimes= ''; // 會次
    this.extraTimes= ''; // 臨時會次
    this.extraTimesStart= ''; // 臨時會次
    this.extraTimesEnd= ''; // 臨時會次
}

// filter criteria for 國是論壇
let Publication3FilterCriteria = function () {
    this.meetingDate = '';  // 會議日期
    this.keyword= '';
    this.startDate= '';     // 會議日期
    this.endDate= '';       // 會議日期
    this.publicationStartDate= '';  // 出版日期
    this.publicationEndDate= '';    // 出版日期
    this.term= ''; // 屆別
    this.sessionPeriod= ''; // 會期
    this.sessionTimes= ''; // 會次
}

// filter criteria for 議事日程草案
let Publication6FilterCriteria = function () {
    this.meetingDate = '';  // 會議日期
    this.keyword= '';
    this.startDate= '';     // 會議日期
    this.endDate= '';       // 會議日期
    this.term= ''; // 屆別
    this.sessionPeriod= ''; // 會期
    this.sessionTimes= ''; // 會次
    this.extraTimes= ''; // 臨時會次
}

// filter criteria for 公報初稿
let Publication7FilterCriteria = function () {
    this.meetingDate = '';  // 會議日期
    this.keyword= '';
    this.startDate= '';     // 會議日期
    this.endDate= '';       // 會議日期
    this.publicationStartDate= '';  // 出版日期
    this.publicationEndDate= '';    // 出版日期
    this.publicationType= []; // 議程類別
    this.sittingMember= ''; // 委員名稱
    this.host= ''; // 委員名稱
    this.term= ''; // 屆別
    this.sessionPeriod= ''; // 會期
    this.sessionTimes= ''; // 會次
}

// filter criteria for 所有會議
let Sitting0FilterCriteria = function () {
    this.meetingDate = '';  // 會議日期
    this.keyword = '';
    this.startDate = '';     // 會議開始日期
    this.endDate = '';       // 會議結束日期
    this.term = ''; // 屆別
    this.sessionPeriod = ''; // 會期
    this.sessionTimes = ''; // 會次
    this.extraTimes = ''; // 臨時會次
    this.sittingCategory = []; // 會議類別
    this.sittingUnit = []; // 會議單位
    this.year = ''; // 會議年份
    this.termSessionPeriod = ''; // 會議屆別會期
    this.sittingUnit2 = ''; // 會議類別
    this.sittingCategory2 = ''; // 會議單位
}

// filter criteria for 院會
let Sitting1FilterCriteria = function () {
    this.meetingDate = '';  // 會議日期
}

// filter criteria for 委員會
let Sitting2FilterCriteria = function () {
    this.meetingDate = '';  // 會議日期
}

// filter criteria for 黨團協商
let Sitting3FilterCriteria = function () {
    this.meetingDate = '';  // 會議日期
}

// filter criteria for 其他會議
let Sitting4FilterCriteria = function () {
    this.meetingDate = '';  // 會議日期
}

//fiter criteria for 中央政府總預算案 - 總預算案之提出
let GeneralBudgetProposeCriteria = function () {
    this.year = '';             // 年度
}

//fiter criteria for 中央政府總預算案 - 總預算案之審查
let GeneralBudgetReviewCriteria = function () {
    this.year = '';             // 年度
    this.meetingUnit = '';      // 會議單元
    this.caseType = '';         // 案例類別
}

//fiter criteria for 中央政府總預算案 - 總預算案之討論
let GeneralBudgetDiscussionCriteria = function () {
    this.year = '';             // 年度
}

//fiter criteria for 中央政府總預算案 - 總預算案之公布
let GeneralBudgetAnnouncementCriteria = function () {
    this.year = '';             // 年度
}

// section properties
let SectionProperty = function(data) {
    this.api = data.api || null;
    this.data = data.data || null;
    this.pageSize = data.pageSize || 6;
    this.page = data.page || 1;
    this.order = data.order || 1;
    this.sort = data.sort || 0;
    this.criteria = data.criteria || null;
};

let CalendarProperty = function(data)  {
    this.api = data.api || null;
    this.selectedDate = new Date();
    this.eventDates = [];
    this.criteria = data.criteria || null;
}
CalendarProperty.prototype.setEventDates = function(dates) {
    let seen = {};
    this.eventDates = dates.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}
