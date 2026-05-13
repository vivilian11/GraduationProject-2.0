Page({
  data: {
    faqList: [
      {
        id: 1,
        question: "如何获得积分？",
        answer: "你可以通过每日签到（+1分）、识别垃圾（+2分）以及参与环保知识问答（答对+2分）来获取积分哦！",
        isOpen: false
      },
      {
        id: 2,
        question: "拍照识别不出来怎么办？",
        answer: "建议在光线充足的环境下拍摄，尽量让垃圾处于画面中心。如果还是识别不出，可以尝试在首页点击“文字识别”手动搜索。",
        isOpen: false
      },
      {
        id: 3,
        question: "勋章是如何点亮的？",
        answer: "勋章分为两种：前三个勋章根据你的累计积分自动点亮；后六个勋章需要消耗 10 积分在“成就”页面手动兑换。",
        isOpen: false
      },
      {
        id: 4,
        question: "积分有什么用？",
        answer: "积分目前可以用来兑换精美的荣誉勋章，未来我们还会增加更多实物奖励兑换功能，敬请期待！",
        isOpen: false
      },
      {
        id: 5,
        question: "垃圾分类的标准是什么？",
        answer: "本系统采用标准的四分类法：可回收物、有害垃圾、厨余垃圾和其他垃圾。具体可参考“分类图鉴”里的详细说明。",
        isOpen: false
      }
    ]
  },

  // 切换折叠状态
  toggleFaq(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.faqList;
    
    // 把点击的那一项取反，其他的可以保持现状
    list[index].isOpen = !list[index].isOpen;
    
    this.setData({
      faqList: list
    });
  }
});