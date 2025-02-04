import { enableFetchMocks } from 'jest-fetch-mock';
import fetchMock from 'jest-fetch-mock';

import {
  AHStats,
  APIKey,
  AuthorizationPolicy,
  ChartTemplatesData,
  CheckAvailabilityProps,
  ErrorKind,
  OptOutItem,
  Organization,
  Package,
  PackageStars,
  Profile,
  RegoPlaygroundPolicy,
  RegoPlaygroundResult,
  Repository,
  RepositoryKind,
  SearchResults,
  SecurityReport,
  Stats,
  Subscription,
  TestWebhook,
  User,
  UserFullName,
  UserLogin,
  Webhook,
} from '../types';
import renameKeysInObject from '../utils/renameKeysInObject';
import API from './index';
enableFetchMocks();

const getData = (fixtureId: string): any => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as any;
};

const getCSRFTokenMock = jest.fn();

describe('API', () => {
  beforeEach(() => {
    API.getCSRFToken = () => {
      getCSRFTokenMock();
      return Promise.resolve('test');
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Test toCamelCase method', () => {
    const tests = getData('1');
    for (let i = 0; i < tests.length; i++) {
      it('renders proper content', () => {
        const actual = API.toCamelCase(tests[i].entry);
        expect(actual).toEqual(tests[i].result);
      });
    }
  });

  describe('getUrlContext', () => {
    const tests = getData('2');
    for (let i = 0; i < tests.length; i++) {
      it('renders proper content', () => {
        const actual = API.getUrlContext(tests[i].entry);
        expect(actual).toEqual(tests[i].output);
      });
    }
  });

  describe('API', () => {
    beforeEach(() => {
      fetchMock.resetMocks();
    });

    describe('handleErrors', () => {
      it('Unauthorized', async () => {
        fetchMock.mockResponse('Unauthorized', {
          status: 401,
        });

        await expect(API.getOrganization('org1')).rejects.toEqual({
          kind: ErrorKind.Unauthorized,
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('NotFound', async () => {
        fetchMock.mockResponse('Not found', {
          status: 404,
        });

        await expect(API.getOrganization('org1')).rejects.toEqual({
          kind: ErrorKind.NotFound,
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('Other with custom message', async () => {
        fetchMock.mockResponse(JSON.stringify({ message: 'custom error' }), {
          headers: {
            'content-type': 'application/json',
          },
          status: 400,
        });

        await expect(API.getOrganization('org1')).rejects.toEqual({
          kind: ErrorKind.Other,
          message: 'custom error',
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('Other without custom message', async () => {
        fetchMock.mockResponse(JSON.stringify({ message: '' }), {
          headers: {
            'content-type': 'application/json',
          },
          status: 400,
        });

        await expect(API.getOrganization('org1')).rejects.toEqual({
          kind: ErrorKind.Other,
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('getPackage', () => {
      it('success', async () => {
        const packageItem = getData('3') as Package;
        fetchMock.mockResponse(JSON.stringify(packageItem), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getPackage({
          packageName: 'pkg1',
          repositoryKind: 'helm',
          repositoryName: 'repoName',
          version: '1.2.1',
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/packages/helm/repoName/pkg1/1.2.1');
        expect(response).toEqual(API.toCamelCase(packageItem));
      });
    });

    describe('toggleStar', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.toggleStar('pkgID');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/packages/pkgID/stars');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(response).toBe('');
      });
    });

    describe('getStars', () => {
      it('success', async () => {
        const stars = getData('4') as PackageStars;
        fetchMock.mockResponse(JSON.stringify(stars), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getStars('pkgID');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/packages/pkgID/stars');
        expect(response.stars).toEqual(stars.stars);
        expect(response.starredByUser).toBeFalsy();
      });
    });

    describe('searchPackages', () => {
      it('success', async () => {
        const search = getData('5') as SearchResults;
        fetchMock.mockResponse(JSON.stringify(search), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.searchPackages({
          tsQueryWeb: 'database',
          filters: {
            kind: [RepositoryKind.Helm.toString()],
            repo: ['repo1', 'repo2'],
            org: ['org1', 'org2'],
          },
          deprecated: false,
          limit: 20,
          offset: 0,
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual(
          '/api/v1/packages/search?facets=true&limit=20&offset=0&kind=0&repo=repo1&repo=repo2&org=org1&org=org2&ts_query_web=database'
        );
        expect(response).toEqual(API.toCamelCase(search));
      });
    });

    describe('getStats', () => {
      it('success', async () => {
        const stats: Stats = getData('6') as Stats;
        fetchMock.mockResponse(JSON.stringify(stats), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getStats();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/packages/stats');
        expect(response.packages).toEqual(stats.packages);
        expect(response.releases).toEqual(stats.releases);
      });
    });

    describe('getRandomPackages', () => {
      it('success', async () => {
        const packages: Package[] = getData('7') as Package[];
        fetchMock.mockResponse(JSON.stringify(packages), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getRandomPackages();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/packages/random');
        expect(response).toEqual(API.toCamelCase(packages));
      });
    });

    describe('register', () => {
      it('success', async () => {
        const user: User = getData('8') as User;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 201,
        });

        const response = await API.register(user);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/users');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify(renameKeysInObject(user, { firstName: 'first_name', lastName: 'last_name' }))
        );
        expect(response).toBe('');
      });
    });

    describe('verifyEmail', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.verifyEmail('123abc');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/users/verify-email');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(JSON.stringify({ code: '123abc' }));
        expect(response).toBe('');
      });
    });

    describe('login', () => {
      it('success', async () => {
        const user: UserLogin = getData('9') as UserLogin;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.login(user);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/users/login');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(JSON.stringify(user));
        expect(response).toBe('');
      });
    });

    describe('logout', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.logout();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/users/logout');
        expect(response).toBe('');
      });
    });

    describe('getUserProfile', () => {
      it('success', async () => {
        const profile: Profile = getData('10') as Profile;
        fetchMock.mockResponse(JSON.stringify(profile), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getUserProfile();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/users/profile');
        expect(response).toEqual(API.toCamelCase(profile));
      });
    });

    describe('checkPasswordStrength', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.checkPasswordStrength('testTest.12');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/users/check-password-strength');
        expect(response).toBe('');
      });
    });

    describe('getRepositories', () => {
      it('success from user', async () => {
        const repositories: Repository[] = getData('11') as Repository[];
        fetchMock.mockResponse(JSON.stringify(repositories), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getRepositories();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/user');
        expect(response).toEqual(API.toCamelCase(repositories));
      });

      it('success from org', async () => {
        const repositories: Repository[] = getData('11') as Repository[];
        fetchMock.mockResponse(JSON.stringify(repositories), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getRepositories('org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/org/org1');
        expect(response).toEqual(API.toCamelCase(repositories));
      });
    });

    describe('addRepository', () => {
      it('success from user', async () => {
        const repo: Repository = getData('12') as Repository;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 201,
        });

        const response = await API.addRepository(repo);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/user');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify(renameKeysInObject(repo, { displayName: 'display_name' }))
        );
        expect(response).toBe('');
      });

      it('success from org', async () => {
        const repo: Repository = getData('12') as Repository;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 201,
        });

        const response = await API.addRepository(repo, 'org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/org/org1');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify(renameKeysInObject(repo, { displayName: 'display_name' }))
        );
        expect(response).toBe('');
      });
    });

    describe('deleteRepository', () => {
      it('success from user', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.deleteRepository('repo1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/user/repo1');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('DELETE');
        expect(response).toBe('');
      });

      it('success from org', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.deleteRepository('repo1', 'org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/org/org1/repo1');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('DELETE');
        expect(response).toBe('');
      });
    });

    describe('updateRepository', () => {
      it('success from user', async () => {
        const repo: Repository = getData('13') as Repository;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.updateRepository(repo);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual(`/api/v1/repositories/user/${repo.name}`);
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify(renameKeysInObject(repo, { displayName: 'display_name' }))
        );
        expect(response).toBe('');
      });

      it('success from org', async () => {
        const repo: Repository = getData('13') as Repository;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.updateRepository(repo, 'org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual(`/api/v1/repositories/org/org1/${repo.name}`);
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify(renameKeysInObject(repo, { displayName: 'display_name' }))
        );
        expect(response).toBe('');
      });
    });

    describe('transferRepository', () => {
      it('from org to user', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.transferRepository({
          repositoryName: 'repo1',
          toOrgName: 'org1',
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/user/repo1/transfer?org=org1');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(response).toBe('');
      });

      it('from org to org', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.transferRepository({
          repositoryName: 'repo1',
          toOrgName: 'org2',
          fromOrgName: 'org1',
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/org/org1/repo1/transfer?org=org2');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(response).toBe('');
      });

      it('from user to org', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.transferRepository({
          repositoryName: 'repo1',
          fromOrgName: 'org1',
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/org/org1/repo1/transfer');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(response).toBe('');
      });
    });

    describe('checkAvailability', () => {
      describe('userAlias resource', () => {
        it('is not available', async () => {
          const resource: CheckAvailabilityProps = getData('14a') as CheckAvailabilityProps;
          fetchMock.mockResponse('', {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            status: 404,
          });

          const response = await API.checkAvailability(resource);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock.mock.calls[0][0]).toEqual(
            `/api/v1/check-availability/${resource.resourceKind}?v=${encodeURIComponent(resource.value)}`
          );
          expect(response).toBeFalsy();
        });

        it('is available', async () => {
          const resource: CheckAvailabilityProps = getData('14a') as CheckAvailabilityProps;
          fetchMock.mockResponse('', {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            status: 204,
          });

          const response = await API.checkAvailability(resource);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock.mock.calls[0][0]).toEqual(
            `/api/v1/check-availability/${resource.resourceKind}?v=${encodeURIComponent(resource.value)}`
          );
          expect(response).toBeTruthy();
        });

        it('is available when response is different to 404', async () => {
          const resource: CheckAvailabilityProps = getData('14a') as CheckAvailabilityProps;
          fetchMock.mockResponse('', {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            status: 500,
          });

          const response = await API.checkAvailability(resource);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock.mock.calls[0][0]).toEqual(
            `/api/v1/check-availability/${resource.resourceKind}?v=${encodeURIComponent(resource.value)}`
          );
          expect(response).toBeTruthy();
        });
      });

      describe('repositoryName resource', () => {
        it('is not available', async () => {
          const resource: CheckAvailabilityProps = getData('14b') as CheckAvailabilityProps;
          fetchMock.mockResponse('', {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            status: 404,
          });

          const response = await API.checkAvailability(resource);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock.mock.calls[0][0]).toEqual(
            `/api/v1/check-availability/${resource.resourceKind}?v=${encodeURIComponent(resource.value)}`
          );
          expect(response).toBeFalsy();
        });

        it('is available', async () => {
          const resource: CheckAvailabilityProps = getData('14b') as CheckAvailabilityProps;
          fetchMock.mockResponse('', {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            status: 204,
          });

          const response = await API.checkAvailability(resource);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock.mock.calls[0][0]).toEqual(
            `/api/v1/check-availability/${resource.resourceKind}?v=${encodeURIComponent(resource.value)}`
          );
          expect(response).toBeTruthy();
        });

        it('is available when response is different to 404', async () => {
          const resource: CheckAvailabilityProps = getData('14b') as CheckAvailabilityProps;
          fetchMock.mockResponse('', {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            status: 500,
          });

          const response = await API.checkAvailability(resource);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock.mock.calls[0][0]).toEqual(
            `/api/v1/check-availability/${resource.resourceKind}?v=${encodeURIComponent(resource.value)}`
          );
          expect(response).toBeTruthy();
        });
      });

      describe('repositoryURL resource', () => {
        it('is not available', async () => {
          const resource: CheckAvailabilityProps = getData('14c') as CheckAvailabilityProps;
          fetchMock.mockResponse('', {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            status: 404,
          });

          const response = await API.checkAvailability(resource);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock.mock.calls[0][0]).toEqual(
            `/api/v1/check-availability/${resource.resourceKind}?v=${encodeURIComponent(resource.value)}`
          );
          expect(response).toBeFalsy();
        });

        it('is available', async () => {
          const resource: CheckAvailabilityProps = getData('14c') as CheckAvailabilityProps;
          fetchMock.mockResponse('', {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            status: 204,
          });

          const response = await API.checkAvailability(resource);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock.mock.calls[0][0]).toEqual(
            `/api/v1/check-availability/${resource.resourceKind}?v=${encodeURIComponent(resource.value)}`
          );
          expect(response).toBeTruthy();
        });

        it('is available when response is different to 404', async () => {
          const resource: CheckAvailabilityProps = getData('14c') as CheckAvailabilityProps;
          fetchMock.mockResponse('', {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            status: 500,
          });

          const response = await API.checkAvailability(resource);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock.mock.calls[0][0]).toEqual(
            `/api/v1/check-availability/${resource.resourceKind}?v=${encodeURIComponent(resource.value)}`
          );
          expect(response).toBeTruthy();
        });
      });

      describe('organizationName resource', () => {
        it('is not available', async () => {
          const resource: CheckAvailabilityProps = getData('14d') as CheckAvailabilityProps;
          fetchMock.mockResponse('', {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            status: 404,
          });

          const response = await API.checkAvailability(resource);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock.mock.calls[0][0]).toEqual(
            `/api/v1/check-availability/${resource.resourceKind}?v=${encodeURIComponent(resource.value)}`
          );
          expect(response).toBeFalsy();
        });

        it('is available', async () => {
          const resource: CheckAvailabilityProps = getData('14d') as CheckAvailabilityProps;
          fetchMock.mockResponse('', {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            status: 204,
          });

          const response = await API.checkAvailability(resource);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock.mock.calls[0][0]).toEqual(
            `/api/v1/check-availability/${resource.resourceKind}?v=${encodeURIComponent(resource.value)}`
          );
          expect(response).toBeTruthy();
        });

        it('is available when response is different to 404', async () => {
          const resource: CheckAvailabilityProps = getData('14d') as CheckAvailabilityProps;
          fetchMock.mockResponse('', {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            status: 500,
          });

          const response = await API.checkAvailability(resource);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock.mock.calls[0][0]).toEqual(
            `/api/v1/check-availability/${resource.resourceKind}?v=${encodeURIComponent(resource.value)}`
          );
          expect(response).toBeTruthy();
        });
      });
    });

    describe('getUserOrganizations', () => {
      it('success', async () => {
        const orgs: Organization[] = getData('15') as Organization[];
        fetchMock.mockResponse(JSON.stringify(orgs), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getUserOrganizations();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/orgs/user');
        expect(response).toEqual(API.toCamelCase(orgs));
      });
    });

    describe('getOrganization', () => {
      it('success', async () => {
        const org: Organization = getData('16') as Organization;
        fetchMock.mockResponse(JSON.stringify(org), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getOrganization('artifacthub');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/orgs/artifacthub');
        expect(response).toEqual(API.toCamelCase(org));
      });
    });

    describe('addOrganization', () => {
      it('success', async () => {
        const org: Organization = getData('17') as Organization;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 201,
        });

        const response = await API.addOrganization(org);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/orgs');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify(
            renameKeysInObject(org, { displayName: 'display_name', logoImageId: 'logo_image_id', homeUrl: 'home_url' })
          )
        );
        expect(response).toBe('');
      });
    });

    describe('updateOrganization', () => {
      it('success', async () => {
        const org: Organization = getData('18') as Organization;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.updateOrganization(org, 'artifacthub');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/orgs/artifacthub');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify(
            renameKeysInObject(org, { displayName: 'display_name', logoImageId: 'logo_image_id', homeUrl: 'home_url' })
          )
        );
        expect(response).toBe('');
      });
    });

    describe('deleteOrganization', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.deleteOrganization('org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/orgs/org1');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('DELETE');
        expect(response).toBe('');
      });
    });

    describe('getOrganizationMembers', () => {
      it('success', async () => {
        const members: User[] = getData('19') as User[];
        fetchMock.mockResponse(JSON.stringify(members), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getOrganizationMembers('artifacthub');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/orgs/artifacthub/members');
        expect(response).toEqual(API.toCamelCase(members));
      });
    });

    describe('addOrganizationMember', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 201,
        });

        const response = await API.addOrganizationMember('artifacthub', 'user1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/orgs/artifacthub/member/user1');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');
        expect(response).toBe('');
      });
    });

    describe('deleteOrganizationMember', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.deleteOrganizationMember('artifacthub', 'user1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/orgs/artifacthub/member/user1');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('DELETE');
        expect(response).toBe('');
      });
    });

    describe('confirmOrganizationMembership', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.confirmOrganizationMembership('org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/orgs/org1/accept-invitation');
        expect(response).toBe('');
      });
    });

    describe('getStarredByUser', () => {
      it('success', async () => {
        const packages: Package[] = getData('16') as Package[];
        fetchMock.mockResponse(JSON.stringify(packages), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getStarredByUser();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/packages/starred');
        expect(response).toEqual(API.toCamelCase(packages));
      });
    });

    describe('updateUserProfile', () => {
      it('success', async () => {
        const profile: UserFullName = getData('21') as UserFullName;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.updateUserProfile(profile);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/users/profile');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify(
            renameKeysInObject(profile, {
              firstName: 'first_name',
              lastName: 'last_name',
              profileImageId: 'profile_image_id',
            })
          )
        );
        expect(response).toBe('');
      });
    });

    describe('updatePassword', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.updatePassword('old', 'new');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/users/password');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify({
            old: 'old',
            new: 'new',
          })
        );
        expect(response).toBe('');
      });
    });

    describe('saveImage', () => {
      it('success', async () => {
        const img =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';
        fetchMock.mockResponse(JSON.stringify({ imageId: '1234abcd' }), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.saveImage(img);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/images');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(img);
        expect(response.imageId).toBe('1234abcd');
      });
    });

    describe('getPackageSubscriptions', () => {
      it('success', async () => {
        const subscriptions: Subscription[] = getData('22') as Subscription[];
        fetchMock.mockResponse(JSON.stringify(subscriptions), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getPackageSubscriptions('pkgId');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/subscriptions/pkgId');
        expect(response).toEqual(API.toCamelCase(subscriptions));
      });
    });

    describe('addSubscription', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.addSubscription('pkgId', 0);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/subscriptions');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(JSON.stringify({ package_id: 'pkgId', event_kind: 0 }));
        expect(response).toBe('');
      });
    });

    describe('deleteSubscription', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.deleteSubscription('pkgId', 0);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/subscriptions?package_id=pkgId&event_kind=0');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('DELETE');
        expect(response).toBe('');
      });
    });

    describe('getUserSubscriptions', () => {
      it('success', async () => {
        const packages: Package[] = getData('23') as Package[];
        fetchMock.mockResponse(JSON.stringify(packages), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getUserSubscriptions();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/subscriptions');
        expect(response).toEqual(API.toCamelCase(packages));
      });
    });

    describe('getWebhooks', () => {
      it('success from user', async () => {
        const webhooks: Webhook[] = getData('24') as Webhook[];
        fetchMock.mockResponse(JSON.stringify(webhooks), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getWebhooks();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/webhooks/user');
        expect(response).toEqual(API.toCamelCase(webhooks));
      });

      it('success from org', async () => {
        const webhooks: Webhook[] = getData('24') as Webhook[];
        fetchMock.mockResponse(JSON.stringify(webhooks), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getWebhooks('org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/webhooks/org/org1');
        expect(response).toEqual(API.toCamelCase(webhooks));
      });
    });

    describe('getWebhook', () => {
      it('success from user', async () => {
        const webhook: Webhook = getData('25') as Webhook;
        fetchMock.mockResponse(JSON.stringify(webhook), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getWebhook('webhookId');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/webhooks/user/webhookId');
        expect(response).toEqual(API.toCamelCase(webhook));
      });

      it('success from org', async () => {
        const webhooks: Webhook[] = getData('24') as Webhook[];
        fetchMock.mockResponse(JSON.stringify(webhooks), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getWebhook('webhookId', 'org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/webhooks/org/org1/webhookId');
        expect(response).toEqual(API.toCamelCase(webhooks));
      });
    });

    describe('addWebhook', () => {
      it('success from user', async () => {
        const webhook: Webhook = getData('26') as Webhook;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 201,
        });

        const response = await API.addWebhook(webhook);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/webhooks/user');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');

        const formattedWebhook = renameKeysInObject(webhook, {
          contentType: 'content_type',
          eventKinds: 'event_kinds',
        });
        const formattedPackages = webhook.packages.map((packageItem: Package) => ({
          package_id: packageItem.packageId,
        }));
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify({
            ...formattedWebhook,
            packages: formattedPackages,
          })
        );
        expect(response).toBe('');
      });

      it('success from org', async () => {
        const webhook: Webhook = getData('26') as Webhook;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 201,
        });

        const response = await API.addWebhook(webhook, 'org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/webhooks/org/org1');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');

        const formattedWebhook = renameKeysInObject(webhook, {
          contentType: 'content_type',
          eventKinds: 'event_kinds',
        });
        const formattedPackages = webhook.packages.map((packageItem: Package) => ({
          package_id: packageItem.packageId,
        }));
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify({
            ...formattedWebhook,
            packages: formattedPackages,
          })
        );
        expect(response).toBe('');
      });
    });

    describe('deleteWebhook', () => {
      it('success from user', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.deleteWebhook('webhook1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/webhooks/user/webhook1');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('DELETE');
        expect(response).toBe('');
      });

      it('success from org', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.deleteWebhook('webhook1', 'org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/webhooks/org/org1/webhook1');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('DELETE');
        expect(response).toBe('');
      });
    });

    describe('updateWebhook', () => {
      it('success from user', async () => {
        const webhook: Webhook = getData('27') as Webhook;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.updateWebhook(webhook);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual(`/api/v1/webhooks/user/${webhook.webhookId}`);
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');

        const formattedWebhook = renameKeysInObject(webhook, {
          contentType: 'content_type',
          eventKinds: 'event_kinds',
        });
        const formattedPackages = webhook.packages.map((packageItem: Package) => ({
          package_id: packageItem.packageId,
        }));
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify({
            ...formattedWebhook,
            packages: formattedPackages,
          })
        );
        expect(response).toBe('');
      });

      it('success from org', async () => {
        const webhook: Webhook = getData('27') as Webhook;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.updateWebhook(webhook, 'org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual(`/api/v1/webhooks/org/org1/${webhook.webhookId}`);
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');

        const formattedWebhook = renameKeysInObject(webhook, {
          contentType: 'content_type',
          eventKinds: 'event_kinds',
        });
        const formattedPackages = webhook.packages.map((packageItem: Package) => ({
          package_id: packageItem.packageId,
        }));
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify({
            ...formattedWebhook,
            packages: formattedPackages,
          })
        );
        expect(response).toBe('');
      });
    });

    describe('triggerWebhookTest', () => {
      it('success', async () => {
        const webhook: TestWebhook = getData('28') as TestWebhook;
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.triggerWebhookTest(webhook);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/webhooks/test');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');

        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify(renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' }))
        );
        expect(response).toBe('');
      });
    });

    describe('getAPIKeys', () => {
      it('success', async () => {
        const apiKeys: APIKey[] = getData('29') as APIKey[];
        fetchMock.mockResponse(JSON.stringify(apiKeys), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getAPIKeys();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/api-keys');
        expect(response).toEqual(API.toCamelCase(apiKeys));
      });
    });

    describe('getAPIKey', () => {
      it('success', async () => {
        const apiKey: APIKey = getData('30') as APIKey;
        fetchMock.mockResponse(JSON.stringify(apiKey), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getAPIKey('apiKeyId');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/api-keys/apiKeyId');
        expect(response).toEqual(API.toCamelCase(apiKey));
      });
    });

    describe('addAPIKey', () => {
      it('success', async () => {
        fetchMock.mockResponse(JSON.stringify({ key: '123abc' }), {
          headers: {
            'content-type': 'application/json',
          },
          status: 204,
        });

        const response = await API.addAPIKey('test');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/api-keys');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');
        expect(response.key).toEqual('123abc');
      });
    });

    describe('updateAPIKey', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.updateAPIKey('apiKeyId', 'newName');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/api-keys/apiKeyId');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify({
            name: 'newName',
          })
        );
        expect(response).toBe('');
      });
    });

    describe('deleteAPIKey', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.deleteAPIKey('apiKeyId');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/api-keys/apiKeyId');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('DELETE');
        expect(response).toBe('');
      });
    });

    describe('getOptOutList', () => {
      it('success', async () => {
        const optOutList: OptOutItem[] = getData('31') as OptOutItem[];
        fetchMock.mockResponse(JSON.stringify(optOutList), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getOptOutList();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/subscriptions/opt-out');
        expect(response).toEqual(API.toCamelCase(optOutList));
      });
    });

    describe('addOptOut', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.addOptOut('repoId', 2);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/subscriptions/opt-out');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('POST');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(JSON.stringify({ repository_id: 'repoId', event_kind: 2 }));
        expect(response).toBe('');
      });
    });

    describe('deleteOptOut', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const response = await API.deleteOptOut('optOutId');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/subscriptions/opt-out/optOutId');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('DELETE');
        expect(response).toBe('');
      });
    });

    describe('getAllRepositories', () => {
      it('success', async () => {
        const repositories: Repository[] = getData('32') as Repository[];
        fetchMock.mockResponse(JSON.stringify(repositories), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getAllRepositories();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories');
        expect(response).toEqual(API.toCamelCase(repositories));
      });
    });

    describe('transferRepository', () => {
      it('from org to user', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const mockRepo = {
          name: 'repo1',
          url: 'https://url.repo',
          kind: 0,
          verified_publisher: false,
          organizationName: 'org1',
        };

        const response = await API.claimRepositoryOwnership(mockRepo);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/org/org1/repo1/claim-ownership');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(response).toBe('');
      });

      it('from org to org', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const mockRepo = {
          name: 'repo1',
          url: 'https://url.repo',
          kind: 0,
          verified_publisher: false,
          organizationName: 'org1',
        };

        const response = await API.claimRepositoryOwnership(mockRepo, 'org2');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/org/org1/repo1/claim-ownership?org=org2');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(response).toBe('');
      });

      it('from user to org', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const mockRepo = {
          name: 'repo1',
          url: 'https://url.repo',
          kind: 0,
          verified_publisher: false,
          userAlias: 'user1',
        };

        const response = await API.claimRepositoryOwnership(mockRepo, 'org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/user/repo1/claim-ownership?org=org1');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(response).toBe('');
      });

      it('from user to user', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const mockRepo = {
          name: 'repo1',
          url: 'https://url.repo',
          kind: 0,
          verified_publisher: false,
          userAlias: 'user1',
        };

        const response = await API.claimRepositoryOwnership(mockRepo);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/repositories/user/repo1/claim-ownership');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(response).toBe('');
      });
    });

    describe('getAuthorizationPolicy', () => {
      it('success', async () => {
        const authz: AuthorizationPolicy = getData('33') as AuthorizationPolicy;
        fetchMock.mockResponse(JSON.stringify(authz), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getAuthorizationPolicy('org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/orgs/org1/authorization-policy');
        expect(response).toEqual(API.toCamelCase(authz));
      });
    });

    describe('updateAuthorizationPolicy', () => {
      it('success', async () => {
        fetchMock.mockResponse('', {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          status: 204,
        });

        const policy = {
          authorizationEnabled: true,
          customPolicy: 'custom',
          policyData: '{}',
        };

        const response = await API.updateAuthorizationPolicy('org1', policy);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/orgs/org1/authorization-policy');
        expect(fetchMock.mock.calls[0][1]!.method).toBe('PUT');
        expect(fetchMock.mock.calls[0][1]!.body).toBe(
          JSON.stringify(
            renameKeysInObject(
              { ...policy },
              {
                authorizationEnabled: 'authorization_enabled',
                predefinedPolicy: 'predefined_policy',
                customPolicy: 'custom_policy',
                policyData: 'policy_data',
              }
            )
          )
        );
        expect(response).toBe('');
      });
    });

    describe('getUserAllowedActions', () => {
      it('success', async () => {
        const actions: string[] = getData('34') as string[];
        fetchMock.mockResponse(JSON.stringify(actions), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getUserAllowedActions('org1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/orgs/org1/user-allowed-actions');
        expect(response).toEqual(API.toCamelCase(actions));
      });
    });

    describe('triggerTestInRegoPlayground', () => {
      it('success', async () => {
        const playgroundPolicy: RegoPlaygroundResult = getData('35') as RegoPlaygroundResult;
        fetchMock.mockResponse(JSON.stringify(playgroundPolicy), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const data: RegoPlaygroundPolicy = {
          rego_modules: { 'policy.rego': 'package artifacthub.authz\n\nallow = true\nallowed_actions = ["all"]' },
          input: { user: 'cynthiasg', action: 'updateOrganization' },
          data: {},
        };

        const response = await API.triggerTestInRegoPlayground(data);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('https://play.openpolicyagent.org/v1/share');
        expect(response).toEqual(API.toCamelCase(playgroundPolicy));
      });
    });

    describe('getSnapshotSecurityReport', () => {
      it('success', async () => {
        const report: SecurityReport = getData('36') as SecurityReport;
        fetchMock.mockResponse(JSON.stringify(report), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getSnapshotSecurityReport('pkgID', '1.1.1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/packages/pkgID/1.1.1/security-report');
        expect(response).toEqual(report);
      });
    });

    describe('getChartTemplates', () => {
      it('success', async () => {
        const templateData: ChartTemplatesData = getData('37') as ChartTemplatesData;
        fetchMock.mockResponse(JSON.stringify(templateData), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getChartTemplates('id', '1.1.0');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/packages/id/1.1.0/templates');
        expect(response).toEqual(templateData);
      });
    });

    describe('getAHStats', () => {
      it('success', async () => {
        const stats: AHStats = getData('38') as AHStats;
        fetchMock.mockResponse(JSON.stringify(stats), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        });

        const response = await API.getAHStats();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toEqual('/api/v1/stats');
        expect(response).toEqual(stats);
      });
    });
  });
});
