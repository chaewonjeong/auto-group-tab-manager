/**
 * 색상 관리 클래스
 * 사이트별 브랜드 색상 매핑 및 색상 할당 알고리즘을 담당합니다.
 */
class ColorManager {
  /**
   * 주요 사이트의 브랜드 색상 데이터베이스
   * Chrome TabGroups API에서 지원하는 색상: grey, blue, red, yellow, green, pink, purple, cyan, orange
   */
  static get BRAND_COLORS() {
    return {
      // 검색 엔진
      google: 'blue',
      bing: 'blue',
      yahoo: 'purple',
      duckduckgo: 'orange',

      // 소셜 미디어
      facebook: 'blue',
      twitter: 'cyan',
      instagram: 'pink',
      linkedin: 'blue',
      pinterest: 'red',
      snapchat: 'yellow',
      tiktok: 'red',
      discord: 'purple',
      telegram: 'cyan',
      whatsapp: 'green',

      // 동영상 플랫폼
      youtube: 'red',
      vimeo: 'cyan',
      twitch: 'purple',
      netflix: 'red',
      hulu: 'green',
      disney: 'blue',

      // 개발 도구
      github: 'grey',
      gitlab: 'orange',
      bitbucket: 'blue',
      stackoverflow: 'orange',
      codepen: 'green',
      jsfiddle: 'blue',
      replit: 'orange',
      codesandbox: 'blue',

      // 클라우드 서비스
      aws: 'orange',
      azure: 'blue',
      gcp: 'blue',
      heroku: 'purple',
      vercel: 'grey',
      netlify: 'cyan',

      // 이커머스
      amazon: 'orange',
      ebay: 'blue',
      etsy: 'orange',
      shopify: 'green',
      aliexpress: 'red',

      // 뉴스 & 미디어
      reddit: 'orange',
      medium: 'green',
      wikipedia: 'grey',
      bbc: 'red',
      cnn: 'red',
      nytimes: 'grey',

      // 한국 사이트
      naver: 'green',
      daum: 'orange',
      kakao: 'yellow',
      coupang: 'red',
      baemin: 'cyan',
      yogiyo: 'pink',
      toss: 'blue',
      kakaopay: 'yellow',
      payco: 'red',

      // 업무 도구
      slack: 'purple',
      notion: 'grey',
      trello: 'blue',
      asana: 'pink',
      monday: 'purple',
      airtable: 'orange',
      figma: 'purple',
      canva: 'cyan',

      // 교육
      coursera: 'blue',
      udemy: 'purple',
      khan: 'green',
      edx: 'blue',

      // 금융
      paypal: 'blue',
      stripe: 'purple',
      coinbase: 'blue',
      binance: 'yellow',

      // 여행
      booking: 'blue',
      airbnb: 'red',
      expedia: 'yellow',
      tripadvisor: 'green',

      // 음악
      spotify: 'green',
      apple: 'grey',
      soundcloud: 'orange',
      pandora: 'blue',

      // 기타
      dropbox: 'blue',
      drive: 'blue', // Google Drive
      onedrive: 'blue',
      icloud: 'blue',
      zoom: 'blue',
      teams: 'purple', // Microsoft Teams
      meet: 'green', // Google Meet
      webex: 'green',
    };
  }

  /**
   * Chrome TabGroups API에서 지원하는 색상 목록
   */
  static get AVAILABLE_COLORS() {
    return [
      'grey',
      'blue',
      'red',
      'yellow',
      'green',
      'pink',
      'purple',
      'cyan',
      'orange',
    ];
  }

  /**
   * 색상별 사용 빈도를 추적하여 균등한 분배를 위한 가중치
   */
  static get COLOR_WEIGHTS() {
    return {
      grey: 1.0,
      blue: 0.8, // 많이 사용되는 색상이므로 가중치 낮춤
      red: 0.9,
      yellow: 1.2, // 덜 사용되는 색상이므로 가중치 높임
      green: 1.0,
      pink: 1.3,
      purple: 1.1,
      cyan: 1.2,
      orange: 1.0,
    };
  }

  /**
   * 사이트명에 대한 색상을 반환합니다.
   * @param {string} siteName - 사이트명
   * @returns {string} Chrome TabGroups API 색상
   */
  static getColorForSite(siteName) {
    if (!siteName || typeof siteName !== 'string') {
      return this.getDefaultColor();
    }

    const lowerSiteName = siteName.toLowerCase();

    // 1. 브랜드 색상 데이터베이스에서 직접 매칭
    if (this.BRAND_COLORS[lowerSiteName]) {
      return this.BRAND_COLORS[lowerSiteName];
    }

    // 2. 부분 매칭 시도 (예: google.co.kr -> google)
    for (const [brand, color] of Object.entries(this.BRAND_COLORS)) {
      if (lowerSiteName.includes(brand) || brand.includes(lowerSiteName)) {
        return color;
      }
    }

    // 3. 도메인 카테고리 기반 색상 할당
    const categoryColor = this.getColorByCategory(lowerSiteName);
    if (categoryColor) {
      return categoryColor;
    }

    // 4. 해시 기반 일관된 색상 할당
    return this.getHashBasedColor(siteName);
  }

  /**
   * 도메인 카테고리에 따른 색상을 반환합니다.
   * @param {string} siteName - 사이트명
   * @returns {string|null} 카테고리 색상 또는 null
   */
  static getColorByCategory(siteName) {
    const categories = {
      // 개발 관련
      dev: [
        'dev',
        'api',
        'docs',
        'doc',
        'developer',
        'code',
        'git',
        'npm',
        'yarn',
      ],
      // 뉴스 관련
      news: ['news', 'times', 'post', 'herald', 'daily', 'journal', 'press'],
      // 쇼핑 관련
      shop: ['shop', 'store', 'mall', 'market', 'buy', 'sell', 'commerce'],
      // 교육 관련
      edu: ['edu', 'learn', 'course', 'school', 'university', 'academy'],
      // 금융 관련
      finance: ['bank', 'pay', 'finance', 'money', 'card', 'loan', 'invest'],
      // 게임 관련
      game: ['game', 'play', 'steam', 'epic', 'battle', 'riot'],
      // 음악 관련
      music: ['music', 'song', 'audio', 'sound', 'radio', 'podcast'],
      // 비디오 관련
      video: ['video', 'movie', 'film', 'tv', 'stream', 'watch'],
    };

    const categoryColors = {
      dev: 'grey',
      news: 'red',
      shop: 'orange',
      edu: 'blue',
      finance: 'green',
      game: 'purple',
      music: 'pink',
      video: 'red',
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => siteName.includes(keyword))) {
        return categoryColors[category];
      }
    }

    return null;
  }

  /**
   * 해시 기반으로 일관된 색상을 생성합니다.
   * @param {string} siteName - 사이트명
   * @returns {string} 색상
   */
  static getHashBasedColor(siteName) {
    // 사이트명을 기반으로 해시 생성
    let hash = 0;
    for (let i = 0; i < siteName.length; i++) {
      const char = siteName.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32비트 정수로 변환
    }

    // 가중치를 고려한 색상 선택
    const colors = this.AVAILABLE_COLORS;
    const weights = this.COLOR_WEIGHTS;

    // 가중치 기반 색상 풀 생성
    const weightedColors = [];
    colors.forEach((color) => {
      const weight = Math.round(weights[color] * 10);
      for (let i = 0; i < weight; i++) {
        weightedColors.push(color);
      }
    });

    const index = Math.abs(hash) % weightedColors.length;
    return weightedColors[index];
  }

  /**
   * 기본 색상을 반환합니다.
   * @returns {string} 기본 색상
   */
  static getDefaultColor() {
    return 'grey';
  }

  /**
   * 색상 통계를 반환합니다.
   * @param {string[]} siteNames - 사이트명 목록
   * @returns {Object} 색상별 사용 통계
   */
  static getColorStatistics(siteNames) {
    const stats = {};
    this.AVAILABLE_COLORS.forEach((color) => {
      stats[color] = 0;
    });

    siteNames.forEach((siteName) => {
      const color = this.getColorForSite(siteName);
      stats[color]++;
    });

    return stats;
  }

  /**
   * 색상 분포의 균등성을 평가합니다.
   * @param {Object} colorStats - 색상 통계
   * @returns {number} 균등성 점수 (0-1, 1이 가장 균등)
   */
  static evaluateColorDistribution(colorStats) {
    const values = Object.values(colorStats);
    const total = values.reduce((sum, count) => sum + count, 0);

    if (total === 0) return 1;

    const expected = total / this.AVAILABLE_COLORS.length;
    const variance =
      values.reduce((sum, count) => sum + Math.pow(count - expected, 2), 0) /
      this.AVAILABLE_COLORS.length;
    const standardDeviation = Math.sqrt(variance);

    // 정규화된 균등성 점수 (0-1)
    return Math.max(0, 1 - standardDeviation / expected);
  }
}

export default ColorManager;
