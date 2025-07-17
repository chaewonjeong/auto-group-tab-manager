import ColorManager from '../color-manager.js';

describe('ColorManager', () => {
  describe('getColorForSite', () => {
    it('알려진 브랜드에 대해 올바른 색상을 반환해야 한다', () => {
      expect(ColorManager.getColorForSite('google')).toBe('blue');
      expect(ColorManager.getColorForSite('youtube')).toBe('red');
      expect(ColorManager.getColorForSite('github')).toBe('grey');
      expect(ColorManager.getColorForSite('facebook')).toBe('blue');
      expect(ColorManager.getColorForSite('twitter')).toBe('cyan');
      expect(ColorManager.getColorForSite('naver')).toBe('green');
      expect(ColorManager.getColorForSite('kakao')).toBe('yellow');
    });
    it('대소문자를 구분하지 않아야 한다', () => {
      expect(ColorManager.getColorForSite('GOOGLE')).toBe('blue');
      expect(ColorManager.getColorForSite('YouTube')).toBe('red');
      expect(ColorManager.getColorForSite('GitHub')).toBe('grey');
      expect(ColorManager.getColorForSite('NAVER')).toBe('green');
    });
    it('부분 브랜드명 매칭이 동작해야 한다', () => {
      const googleColor = ColorManager.getColorForSite('google-analytics');
      expect(ColorManager.AVAILABLE_COLORS).toContain(googleColor);
    });
    it('알려지지 않은 사이트에 대해 유효한 색상을 반환해야 한다', () => {
      const unknownSiteColor =
        ColorManager.getColorForSite('unknown-site-12345');
      expect(ColorManager.AVAILABLE_COLORS).toContain(unknownSiteColor);
    });
    it('동일한 사이트명에 대해 일관된 색상을 반환해야 한다', () => {
      const siteName = 'test-consistency-site';
      const color1 = ColorManager.getColorForSite(siteName);
      const color2 = ColorManager.getColorForSite(siteName);
      expect(color1).toBe(color2);
    });
    it('잘못된 입력에 대해 기본 색상을 반환해야 한다', () => {
      expect(ColorManager.getColorForSite('')).toBe('grey');
      expect(ColorManager.getColorForSite(null)).toBe('grey');
      expect(ColorManager.getColorForSite(undefined)).toBe('grey');
      expect(ColorManager.getColorForSite(123)).toBe('grey');
    });
  });

  describe('getColorByCategory', () => {
    it('개발 관련 사이트에 대해 올바른 색상을 반환해야 한다', () => {
      expect(ColorManager.getColorByCategory('dev-tools')).toBe('grey');
      expect(ColorManager.getColorByCategory('api-docs')).toBe('grey');
      expect(ColorManager.getColorByCategory('code-editor')).toBe('grey');
    });
    it('뉴스 관련 사이트에 대해 올바른 색상을 반환해야 한다', () => {
      expect(ColorManager.getColorByCategory('news-site')).toBe('red');
      expect(ColorManager.getColorByCategory('daily-times')).toBe('red');
      expect(ColorManager.getColorByCategory('press-release')).toBe('red');
    });
    it('쇼핑 관련 사이트에 대해 올바른 색상을 반환해야 한다', () => {
      expect(ColorManager.getColorByCategory('online-shop')).toBe('orange');
      expect(ColorManager.getColorByCategory('marketplace')).toBe('orange');
      expect(ColorManager.getColorByCategory('commerce-site')).toBe('orange');
    });
    it('카테고리에 해당하지 않는 경우 null을 반환해야 한다', () => {
      expect(ColorManager.getColorByCategory('random-site')).toBe(null);
      expect(ColorManager.getColorByCategory('unknown')).toBe(null);
    });
  });

  describe('getHashBasedColor', () => {
    it('임의의 사이트명에 대해 유효한 색상을 반환해야 한다', () => {
      const testSites = [
        'test1',
        'test2',
        'test3',
        'random-site',
        'another-site',
      ];
      testSites.forEach((site) => {
        const color = ColorManager.getHashBasedColor(site);
        expect(ColorManager.AVAILABLE_COLORS).toContain(color);
      });
    });
    it('동일한 입력에 대해 일관된 색상을 반환해야 한다', () => {
      const siteName = 'consistent-test-site';
      const color1 = ColorManager.getHashBasedColor(siteName);
      const color2 = ColorManager.getHashBasedColor(siteName);
      expect(color1).toBe(color2);
    });
    it('서로 다른 입력에 대해 다양한 색상을 반환해야 한다', () => {
      const sites = ['site1', 'site2', 'site3', 'site4', 'site5'];
      const colors = sites.map((site) => ColorManager.getHashBasedColor(site));
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThan(1);
    });
  });

  describe('static color arrays', () => {
    it('AVAILABLE_COLORS는 모든 예상 색상을 포함해야 한다', () => {
      const expectedColors = [
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
      expect(ColorManager.AVAILABLE_COLORS).toEqual(expectedColors);
    });
    it('BRAND_COLORS는 객체이며 유효한 색상만 사용해야 한다', () => {
      expect(typeof ColorManager.BRAND_COLORS).toBe('object');
      Object.values(ColorManager.BRAND_COLORS).forEach((color) => {
        expect(ColorManager.AVAILABLE_COLORS).toContain(color);
      });
    });
    it('COLOR_WEIGHTS는 모든 색상에 대한 가중치를 포함해야 한다', () => {
      ColorManager.AVAILABLE_COLORS.forEach((color) => {
        expect(ColorManager.COLOR_WEIGHTS).toHaveProperty(color);
        expect(typeof ColorManager.COLOR_WEIGHTS[color]).toBe('number');
        expect(ColorManager.COLOR_WEIGHTS[color]).toBeGreaterThan(0);
      });
    });
  });
});
