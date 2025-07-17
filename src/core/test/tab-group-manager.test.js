import DomainAnalyzer from '../domain-analyzer.js';
import ColorManager from '../color-manager.js';
import TabGroupManager from '../tab-group-manager.js';

// Mock chrome API
global.chrome = {
  tabGroups: {
    query: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
  },
  tabs: {
    group: jest.fn(),
  },
};

describe('TabGroupManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getExistingGroup', () => {
    it('기존 그룹이 있으면 해당 그룹을 반환해야 한다', async () => {
      const mockGroups = [
        { id: 1, title: 'google', color: 'blue' },
        { id: 2, title: 'github', color: 'grey' },
      ];
      chrome.tabGroups.query.mockResolvedValue(mockGroups);
      const result = await TabGroupManager.getExistingGroup('www.google.com');
      expect(result).toEqual(mockGroups[0]);
      expect(chrome.tabGroups.query).toHaveBeenCalledWith({});
    });
    it('windowId가 주어지면 해당 윈도우에서만 검색해야 한다', async () => {
      const mockGroups = [{ id: 1, title: 'google', color: 'blue' }];
      chrome.tabGroups.query.mockResolvedValue(mockGroups);
      await TabGroupManager.getExistingGroup('www.google.com', 123);
      expect(chrome.tabGroups.query).toHaveBeenCalledWith({ windowId: 123 });
    });
    it('기존 그룹이 없으면 null을 반환해야 한다', async () => {
      chrome.tabGroups.query.mockResolvedValue([]);
      const result = await TabGroupManager.getExistingGroup('www.example.com');
      expect(result).toBeNull();
    });
    it('API 오류 시 null을 반환해야 한다', async () => {
      chrome.tabGroups.query.mockRejectedValue(new Error('API Error'));
      const result = await TabGroupManager.getExistingGroup('www.google.com');
      expect(result).toBeNull();
    });
  });

  // ... (다른 메서드 테스트도 필요시 한글로 추가)
});
