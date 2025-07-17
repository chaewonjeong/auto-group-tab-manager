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
    query: jest.fn(),
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

  describe('createNewGroup', () => {
    it('새로운 그룹을 성공적으로 생성해야 한다', async () => {
      const mockTab = { id: 1, url: 'https://google.com', windowId: 1 };
      const mockGroupId = 123;

      chrome.tabs.group.mockResolvedValue(mockGroupId);
      chrome.tabGroups.update.mockResolvedValue();

      const result = await TabGroupManager.createNewGroup(mockTab, 'google');

      expect(result).toBe(mockGroupId);
      expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [1] });
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(mockGroupId, {
        title: 'google',
        color: 'blue', // ColorManager에서 google은 blue를 반환
        collapsed: false,
      });
    });

    it('그룹 생성 실패 시 null을 반환해야 한다', async () => {
      const mockTab = { id: 1, url: 'https://google.com', windowId: 1 };

      chrome.tabs.group.mockRejectedValue(new Error('Group creation failed'));

      const result = await TabGroupManager.createNewGroup(mockTab, 'google');

      expect(result).toBeNull();
    });
  });

  describe('assignTabToGroup', () => {
    it('탭을 그룹에 성공적으로 할당해야 한다', async () => {
      chrome.tabs.group.mockResolvedValue();

      const result = await TabGroupManager.assignTabToGroup(1, 123);

      expect(result).toBe(true);
      expect(chrome.tabs.group).toHaveBeenCalledWith({
        tabIds: [1],
        groupId: 123,
      });
    });

    it('탭 할당 실패 시 false를 반환해야 한다', async () => {
      chrome.tabs.group.mockRejectedValue(new Error('Assignment failed'));

      const result = await TabGroupManager.assignTabToGroup(1, 123);

      expect(result).toBe(false);
    });
  });

  describe('createOrUpdateGroup', () => {
    it('기존 그룹이 있으면 해당 그룹에 탭을 추가해야 한다', async () => {
      const mockTab = { id: 1, url: 'https://google.com', windowId: 1 };
      const mockExistingGroup = { id: 123, title: 'google', color: 'blue' };

      // getExistingGroup 모킹
      chrome.tabGroups.query.mockResolvedValue([mockExistingGroup]);
      chrome.tabs.group.mockResolvedValue();

      const result = await TabGroupManager.createOrUpdateGroup(
        mockTab,
        'google.com'
      );

      expect(result).toBe(123);
      expect(chrome.tabs.group).toHaveBeenCalledWith({
        tabIds: [1],
        groupId: 123,
      });
    });

    it('기존 그룹이 없으면 새 그룹을 생성해야 한다', async () => {
      const mockTab = { id: 1, url: 'https://google.com', windowId: 1 };
      const mockNewGroupId = 456;

      // 기존 그룹 없음
      chrome.tabGroups.query.mockResolvedValue([]);
      // 새 그룹 생성
      chrome.tabs.group.mockResolvedValue(mockNewGroupId);
      chrome.tabGroups.update.mockResolvedValue();

      const result = await TabGroupManager.createOrUpdateGroup(
        mockTab,
        'google.com'
      );

      expect(result).toBe(mockNewGroupId);
      expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [1] });
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(mockNewGroupId, {
        title: 'google',
        color: 'blue',
        collapsed: false,
      });
    });

    it('오류 발생 시 null을 반환해야 한다', async () => {
      const mockTab = { id: 1, url: 'https://google.com', windowId: 1 };

      // getExistingGroup에서 오류 발생
      chrome.tabGroups.query.mockRejectedValue(new Error('Query failed'));

      // createNewGroup도 실패하도록 설정
      chrome.tabs.group.mockRejectedValue(new Error('Group creation failed'));

      const result = await TabGroupManager.createOrUpdateGroup(
        mockTab,
        'google.com'
      );

      expect(result).toBeNull();
    });
  });

  describe('getGroupColor', () => {
    it('사이트명에 따른 올바른 색상을 반환해야 한다', () => {
      expect(TabGroupManager.getGroupColor('google')).toBe('blue');
      expect(TabGroupManager.getGroupColor('github')).toBe('grey');
      expect(TabGroupManager.getGroupColor('youtube')).toBe('red');
    });
  });

  describe('findDuplicateGroups', () => {
    it('중복 그룹을 찾아 반환해야 한다', async () => {
      const mockGroups = [
        { id: 1, title: 'google', color: 'blue' },
        { id: 2, title: 'google', color: 'blue' },
        { id: 3, title: 'github', color: 'grey' },
      ];

      chrome.tabGroups.query.mockResolvedValue(mockGroups);

      const result = await TabGroupManager.findDuplicateGroups('google.com');

      expect(result).toHaveLength(2);
      expect(result).toEqual([mockGroups[0], mockGroups[1]]);
    });

    it('중복 그룹이 없으면 빈 배열을 반환해야 한다', async () => {
      const mockGroups = [
        { id: 1, title: 'google', color: 'blue' },
        { id: 2, title: 'github', color: 'grey' },
      ];

      chrome.tabGroups.query.mockResolvedValue(mockGroups);

      const result = await TabGroupManager.findDuplicateGroups(
        'stackoverflow.com'
      );

      expect(result).toHaveLength(0);
    });

    it('API 오류 시 빈 배열을 반환해야 한다', async () => {
      chrome.tabGroups.query.mockRejectedValue(new Error('Query failed'));

      const result = await TabGroupManager.findDuplicateGroups('google.com');

      expect(result).toEqual([]);
    });
  });

  describe('mergeDuplicateGroups', () => {
    it('중복 그룹을 성공적으로 병합해야 한다', async () => {
      const duplicateGroups = [
        { id: 1, title: 'google', color: 'blue' },
        { id: 2, title: 'google', color: 'blue' },
        { id: 3, title: 'google', color: 'blue' },
      ];

      // 각 그룹의 탭들 모킹
      chrome.tabs.query
        .mockResolvedValueOnce([{ id: 10, groupId: 2 }]) // 그룹 2의 탭
        .mockResolvedValueOnce([{ id: 11, groupId: 3 }]); // 그룹 3의 탭

      chrome.tabs.group.mockResolvedValue();

      const result = await TabGroupManager.mergeDuplicateGroups(
        duplicateGroups
      );

      expect(result).toBe(true);
      expect(chrome.tabs.group).toHaveBeenCalledWith({
        tabIds: [10],
        groupId: 1, // 메인 그룹으로 이동
      });
      expect(chrome.tabs.group).toHaveBeenCalledWith({
        tabIds: [11],
        groupId: 1, // 메인 그룹으로 이동
      });
    });

    it('중복 그룹이 1개 이하면 true를 반환해야 한다', async () => {
      const singleGroup = [{ id: 1, title: 'google', color: 'blue' }];

      const result = await TabGroupManager.mergeDuplicateGroups(singleGroup);

      expect(result).toBe(true);
      expect(chrome.tabs.query).not.toHaveBeenCalled();
    });

    it('병합 실패 시 false를 반환해야 한다', async () => {
      const duplicateGroups = [
        { id: 1, title: 'google', color: 'blue' },
        { id: 2, title: 'google', color: 'blue' },
      ];

      chrome.tabs.query.mockRejectedValue(new Error('Query failed'));

      const result = await TabGroupManager.mergeDuplicateGroups(
        duplicateGroups
      );

      expect(result).toBe(false);
    });
  });
});
