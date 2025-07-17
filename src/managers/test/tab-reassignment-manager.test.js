import TabReassignmentManager from '../tab-reassignment-manager.js';
import DomainAnalyzer from '../../core/domain-analyzer.js';
import TabGroupManager from '../../core/tab-group-manager.js';
import StorageUtils from '../../utils/storage-utils.js';

// Chrome API 모킹
global.chrome = {
  tabs: {
    get: jest.fn(),
    ungroup: jest.fn(),
    query: jest.fn(),
  },
  tabGroups: {
    TAB_GROUP_ID_NONE: -1,
  },
};

describe('TabReassignmentManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // 기본 모킹 설정
    global.chrome.tabs.get.mockResolvedValue({
      id: 1,
      url: 'https://example.com',
      groupId: 2,
    });

    global.chrome.tabs.ungroup.mockResolvedValue();
    global.chrome.tabs.query.mockResolvedValue([]);
  });

  describe('handleTabUpdate', () => {
    test('URL이 변경되지 않으면 아무 작업도 하지 않아야 함', async () => {
      const tabId = 1;
      const changeInfo = { title: 'New Title' }; // URL 변경 없음
      const tab = { id: 1, url: 'https://example.com' };

      const reassignSpy = jest.spyOn(
        TabReassignmentManager,
        'reassignTabToCorrectGroup'
      );

      await TabReassignmentManager.handleTabUpdate(tabId, changeInfo, tab);

      expect(reassignSpy).not.toHaveBeenCalled();
    });

    test('URL이 변경되면 도메인을 비교하고 재할당해야 함', async () => {
      const tabId = 1;
      const changeInfo = { url: 'https://old-site.com' };
      const tab = { id: 1, url: 'https://new-site.com' };

      // DomainAnalyzer 모킹
      jest
        .spyOn(DomainAnalyzer, 'extractSiteName')
        .mockReturnValueOnce('old-site') // oldUrl
        .mockReturnValueOnce('new-site'); // newUrl

      jest.spyOn(DomainAnalyzer, 'compareDomains').mockReturnValue(false); // 도메인이 다름

      const reassignSpy = jest
        .spyOn(TabReassignmentManager, 'reassignTabToCorrectGroup')
        .mockResolvedValue();

      await TabReassignmentManager.handleTabUpdate(tabId, changeInfo, tab);

      expect(DomainAnalyzer.extractSiteName).toHaveBeenCalledWith(
        'https://old-site.com'
      );
      expect(DomainAnalyzer.extractSiteName).toHaveBeenCalledWith(
        'https://new-site.com'
      );
      expect(DomainAnalyzer.compareDomains).toHaveBeenCalledWith(
        'old-site',
        'new-site'
      );
      expect(reassignSpy).toHaveBeenCalledWith(tab, 'new-site', 'old-site');
    });

    test('도메인이 같으면 재할당하지 않아야 함', async () => {
      const tabId = 1;
      const changeInfo = { url: 'https://example.com/old-page' };
      const tab = { id: 1, url: 'https://example.com/new-page' };

      jest.spyOn(DomainAnalyzer, 'extractSiteName').mockReturnValue('example'); // 같은 도메인

      jest.spyOn(DomainAnalyzer, 'compareDomains').mockReturnValue(true); // 도메인이 같음

      const reassignSpy = jest.spyOn(
        TabReassignmentManager,
        'reassignTabToCorrectGroup'
      );

      await TabReassignmentManager.handleTabUpdate(tabId, changeInfo, tab);

      expect(reassignSpy).not.toHaveBeenCalled();
    });
  });

  describe('reassignTabToCorrectGroup', () => {
    test('제외 도메인인 경우 그룹화하지 않아야 함', async () => {
      const tab = { id: 1, url: 'https://excluded.com' };
      const newDomain = 'excluded';
      const oldDomain = 'old-site';

      jest
        .spyOn(TabReassignmentManager, 'removeFromCurrentGroup')
        .mockResolvedValue();
      jest
        .spyOn(TabReassignmentManager, 'shouldExcludeFromGrouping')
        .mockResolvedValue(true);

      const findGroupSpy = jest.spyOn(
        TabReassignmentManager,
        'findOrCreateTargetGroup'
      );
      const assignSpy = jest.spyOn(TabGroupManager, 'assignTabToGroup');

      await TabReassignmentManager.reassignTabToCorrectGroup(
        tab,
        newDomain,
        oldDomain
      );

      expect(findGroupSpy).not.toHaveBeenCalled();
      expect(assignSpy).not.toHaveBeenCalled();
    });

    test('새 그룹을 찾거나 생성하고 탭을 할당해야 함', async () => {
      const tab = { id: 1, url: 'https://new-site.com' };
      const newDomain = 'new-site';
      const oldDomain = 'old-site';
      const targetGroup = { id: 3, title: 'new-site' };

      jest
        .spyOn(TabReassignmentManager, 'removeFromCurrentGroup')
        .mockResolvedValue();
      jest
        .spyOn(TabReassignmentManager, 'shouldExcludeFromGrouping')
        .mockResolvedValue(false);
      jest
        .spyOn(TabReassignmentManager, 'findOrCreateTargetGroup')
        .mockResolvedValue(targetGroup);
      jest.spyOn(TabGroupManager, 'assignTabToGroup').mockResolvedValue(true);
      jest.spyOn(TabGroupManager, 'cleanupEmptyGroups').mockResolvedValue();

      await TabReassignmentManager.reassignTabToCorrectGroup(
        tab,
        newDomain,
        oldDomain
      );

      expect(
        TabReassignmentManager.removeFromCurrentGroup
      ).toHaveBeenCalledWith(1);
      expect(
        TabReassignmentManager.findOrCreateTargetGroup
      ).toHaveBeenCalledWith(newDomain, tab);
      expect(TabGroupManager.assignTabToGroup).toHaveBeenCalledWith(1, 3);
      expect(TabGroupManager.cleanupEmptyGroups).toHaveBeenCalled();
    });
  });

  describe('removeFromCurrentGroup', () => {
    test('탭이 그룹에 속해 있으면 그룹에서 제거해야 함', async () => {
      const tabId = 1;
      const tab = { id: 1, groupId: 2 };

      global.chrome.tabs.get.mockResolvedValue(tab);

      await TabReassignmentManager.removeFromCurrentGroup(tabId);

      expect(global.chrome.tabs.get).toHaveBeenCalledWith(tabId);
      expect(global.chrome.tabs.ungroup).toHaveBeenCalledWith(tabId);
    });

    test('탭이 그룹에 속해 있지 않으면 아무 작업도 하지 않아야 함', async () => {
      const tabId = 1;
      const tab = { id: 1, groupId: -1 }; // TAB_GROUP_ID_NONE

      global.chrome.tabs.get.mockResolvedValue(tab);

      await TabReassignmentManager.removeFromCurrentGroup(tabId);

      expect(global.chrome.tabs.get).toHaveBeenCalledWith(tabId);
      expect(global.chrome.tabs.ungroup).not.toHaveBeenCalled();
    });

    test('Chrome API 오류 시 에러를 로그하고 계속 진행해야 함', async () => {
      const tabId = 1;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      global.chrome.tabs.get.mockRejectedValue(new Error('Tab not found'));

      await expect(
        TabReassignmentManager.removeFromCurrentGroup(tabId)
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to remove tab from group:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('findOrCreateTargetGroup', () => {
    test('기존 그룹이 있으면 해당 그룹을 반환해야 함', async () => {
      const domain = 'example';
      const tab = { id: 1, url: 'https://example.com' };
      const existingGroup = { id: 2, title: 'example' };

      jest
        .spyOn(TabGroupManager, 'getExistingGroup')
        .mockResolvedValue(existingGroup);

      const result = await TabReassignmentManager.findOrCreateTargetGroup(
        domain,
        tab
      );

      expect(TabGroupManager.getExistingGroup).toHaveBeenCalledWith(domain);
      expect(result).toBe(existingGroup);
    });

    test('기존 그룹이 없으면 새 그룹을 생성해야 함', async () => {
      const domain = 'example';
      const tab = { id: 1, url: 'https://example.com' };
      const newGroup = { id: 3, title: 'example' };

      jest.spyOn(TabGroupManager, 'getExistingGroup').mockResolvedValue(null);
      jest.spyOn(TabGroupManager, 'createOrUpdateGroup').mockResolvedValue(3);

      const result = await TabReassignmentManager.findOrCreateTargetGroup(
        domain,
        tab
      );

      expect(TabGroupManager.getExistingGroup).toHaveBeenCalledWith(domain);
      expect(TabGroupManager.createOrUpdateGroup).toHaveBeenCalledWith(
        tab,
        domain
      );
      expect(result).toBe(3);
    });
  });

  describe('shouldExcludeFromGrouping', () => {
    test('제외 도메인 목록에 있는 도메인은 true를 반환해야 함', async () => {
      const domain = 'localhost';
      const settings = { excludedDomains: ['localhost', 'chrome://'] };

      jest.spyOn(StorageUtils, 'loadSettings').mockResolvedValue(settings);
      jest.spyOn(DomainAnalyzer, 'isExcludedDomain').mockReturnValue(true);

      const result = await TabReassignmentManager.shouldExcludeFromGrouping(
        domain
      );

      expect(StorageUtils.loadSettings).toHaveBeenCalled();
      expect(DomainAnalyzer.isExcludedDomain).toHaveBeenCalledWith(
        domain,
        settings.excludedDomains
      );
      expect(result).toBe(true);
    });

    test('제외 도메인 목록에 없는 도메인은 false를 반환해야 함', async () => {
      const domain = 'example';
      const settings = { excludedDomains: ['localhost', 'chrome://'] };

      jest.spyOn(StorageUtils, 'loadSettings').mockResolvedValue(settings);
      jest.spyOn(DomainAnalyzer, 'isExcludedDomain').mockReturnValue(false);

      const result = await TabReassignmentManager.shouldExcludeFromGrouping(
        domain
      );

      expect(result).toBe(false);
    });

    test('설정이 없으면 기본값으로 false를 반환해야 함', async () => {
      const domain = 'example';

      jest.spyOn(StorageUtils, 'loadSettings').mockResolvedValue(null);
      jest.spyOn(DomainAnalyzer, 'isExcludedDomain').mockReturnValue(false);

      const result = await TabReassignmentManager.shouldExcludeFromGrouping(
        domain
      );

      expect(DomainAnalyzer.isExcludedDomain).toHaveBeenCalledWith(domain, []);
      expect(result).toBe(false);
    });
  });
});
