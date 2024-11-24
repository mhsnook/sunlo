/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

import { createFileRoute } from '@tanstack/react-router'

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as LearnImport } from './routes/learn'
import { Route as UserImport } from './routes/_user'
import { Route as AuthImport } from './routes/_auth'
import { Route as LearnIndexImport } from './routes/learn/index'
import { Route as LearnQuickSearchImport } from './routes/learn/quick-search'
import { Route as LearnAddDeckImport } from './routes/learn/add-deck'
import { Route as LearnLangImport } from './routes/learn/$lang'
import { Route as UserProfileImport } from './routes/_user/profile'
import { Route as UserGettingStartedImport } from './routes/_user/getting-started'
import { Route as UserFriendsImport } from './routes/_user/friends'
import { Route as UserAcceptInviteImport } from './routes/_user/accept-invite'
import { Route as AuthLoginImport } from './routes/_auth/login'
import { Route as AuthFindAFriendImport } from './routes/_auth/find-a-friend'
import { Route as LearnLangIndexImport } from './routes/learn/$lang/index'
import { Route as UserProfileIndexImport } from './routes/_user/profile.index'
import { Route as UserFriendsIndexImport } from './routes/_user/friends.index'
import { Route as LearnLangSearchImport } from './routes/learn/$lang/search'
import { Route as LearnLangReviewImport } from './routes/learn/$lang/review'
import { Route as LearnLangPublicLibraryImport } from './routes/learn/$lang/public-library'
import { Route as LearnLangDeckSettingsImport } from './routes/learn/$lang/deck-settings'
import { Route as LearnLangAddPhraseImport } from './routes/learn/$lang/add-phrase'
import { Route as UserProfileChangePasswordImport } from './routes/_user/profile.change-password'
import { Route as UserProfileChangeEmailImport } from './routes/_user/profile.change-email'
import { Route as UserFriendsSearchImport } from './routes/_user/friends.search'
import { Route as UserFriendsInviteImport } from './routes/_user/friends.invite'
import { Route as UserFriendsUidImport } from './routes/_user/friends.$uid'
import { Route as UserFriendsSearchUidImport } from './routes/_user/friends.search.$uid'

// Create Virtual Routes

const PrivacyPolicyLazyImport = createFileRoute('/privacy-policy')()
const ComponentsLazyImport = createFileRoute('/components')()
const IndexLazyImport = createFileRoute('/')()
const AuthSignupLazyImport = createFileRoute('/_auth/signup')()
const AuthSetNewPasswordLazyImport = createFileRoute(
  '/_auth/set-new-password',
)()
const AuthForgotPasswordLazyImport = createFileRoute('/_auth/forgot-password')()

// Create/Update Routes

const PrivacyPolicyLazyRoute = PrivacyPolicyLazyImport.update({
  path: '/privacy-policy',
  getParentRoute: () => rootRoute,
} as any).lazy(() =>
  import('./routes/privacy-policy.lazy').then((d) => d.Route),
)

const ComponentsLazyRoute = ComponentsLazyImport.update({
  path: '/components',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/components.lazy').then((d) => d.Route))

const LearnRoute = LearnImport.update({
  path: '/learn',
  getParentRoute: () => rootRoute,
} as any)

const UserRoute = UserImport.update({
  id: '/_user',
  getParentRoute: () => rootRoute,
} as any)

const AuthRoute = AuthImport.update({
  id: '/_auth',
  getParentRoute: () => rootRoute,
} as any)

const IndexLazyRoute = IndexLazyImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/index.lazy').then((d) => d.Route))

const LearnIndexRoute = LearnIndexImport.update({
  path: '/',
  getParentRoute: () => LearnRoute,
} as any)

const AuthSignupLazyRoute = AuthSignupLazyImport.update({
  path: '/signup',
  getParentRoute: () => AuthRoute,
} as any).lazy(() => import('./routes/_auth/signup.lazy').then((d) => d.Route))

const AuthSetNewPasswordLazyRoute = AuthSetNewPasswordLazyImport.update({
  path: '/set-new-password',
  getParentRoute: () => AuthRoute,
} as any).lazy(() =>
  import('./routes/_auth/set-new-password.lazy').then((d) => d.Route),
)

const AuthForgotPasswordLazyRoute = AuthForgotPasswordLazyImport.update({
  path: '/forgot-password',
  getParentRoute: () => AuthRoute,
} as any).lazy(() =>
  import('./routes/_auth/forgot-password.lazy').then((d) => d.Route),
)

const LearnQuickSearchRoute = LearnQuickSearchImport.update({
  path: '/quick-search',
  getParentRoute: () => LearnRoute,
} as any)

const LearnAddDeckRoute = LearnAddDeckImport.update({
  path: '/add-deck',
  getParentRoute: () => LearnRoute,
} as any)

const LearnLangRoute = LearnLangImport.update({
  path: '/$lang',
  getParentRoute: () => LearnRoute,
} as any)

const UserProfileRoute = UserProfileImport.update({
  path: '/profile',
  getParentRoute: () => UserRoute,
} as any)

const UserGettingStartedRoute = UserGettingStartedImport.update({
  path: '/getting-started',
  getParentRoute: () => UserRoute,
} as any)

const UserFriendsRoute = UserFriendsImport.update({
  path: '/friends',
  getParentRoute: () => UserRoute,
} as any)

const UserAcceptInviteRoute = UserAcceptInviteImport.update({
  path: '/accept-invite',
  getParentRoute: () => UserRoute,
} as any)

const AuthLoginRoute = AuthLoginImport.update({
  path: '/login',
  getParentRoute: () => AuthRoute,
} as any)

const AuthFindAFriendRoute = AuthFindAFriendImport.update({
  path: '/find-a-friend',
  getParentRoute: () => AuthRoute,
} as any)

const LearnLangIndexRoute = LearnLangIndexImport.update({
  path: '/',
  getParentRoute: () => LearnLangRoute,
} as any)

const UserProfileIndexRoute = UserProfileIndexImport.update({
  path: '/',
  getParentRoute: () => UserProfileRoute,
} as any)

const UserFriendsIndexRoute = UserFriendsIndexImport.update({
  path: '/',
  getParentRoute: () => UserFriendsRoute,
} as any)

const LearnLangSearchRoute = LearnLangSearchImport.update({
  path: '/search',
  getParentRoute: () => LearnLangRoute,
} as any)

const LearnLangReviewRoute = LearnLangReviewImport.update({
  path: '/review',
  getParentRoute: () => LearnLangRoute,
} as any)

const LearnLangPublicLibraryRoute = LearnLangPublicLibraryImport.update({
  path: '/public-library',
  getParentRoute: () => LearnLangRoute,
} as any)

const LearnLangDeckSettingsRoute = LearnLangDeckSettingsImport.update({
  path: '/deck-settings',
  getParentRoute: () => LearnLangRoute,
} as any)

const LearnLangAddPhraseRoute = LearnLangAddPhraseImport.update({
  path: '/add-phrase',
  getParentRoute: () => LearnLangRoute,
} as any)

const UserProfileChangePasswordRoute = UserProfileChangePasswordImport.update({
  path: '/change-password',
  getParentRoute: () => UserProfileRoute,
} as any)

const UserProfileChangeEmailRoute = UserProfileChangeEmailImport.update({
  path: '/change-email',
  getParentRoute: () => UserProfileRoute,
} as any)

const UserFriendsSearchRoute = UserFriendsSearchImport.update({
  path: '/search',
  getParentRoute: () => UserFriendsRoute,
} as any)

const UserFriendsInviteRoute = UserFriendsInviteImport.update({
  path: '/invite',
  getParentRoute: () => UserFriendsRoute,
} as any)

const UserFriendsUidRoute = UserFriendsUidImport.update({
  path: '/$uid',
  getParentRoute: () => UserFriendsRoute,
} as any)

const UserFriendsSearchUidRoute = UserFriendsSearchUidImport.update({
  path: '/$uid',
  getParentRoute: () => UserFriendsSearchRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexLazyImport
      parentRoute: typeof rootRoute
    }
    '/_auth': {
      id: '/_auth'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof AuthImport
      parentRoute: typeof rootRoute
    }
    '/_user': {
      id: '/_user'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof UserImport
      parentRoute: typeof rootRoute
    }
    '/learn': {
      id: '/learn'
      path: '/learn'
      fullPath: '/learn'
      preLoaderRoute: typeof LearnImport
      parentRoute: typeof rootRoute
    }
    '/components': {
      id: '/components'
      path: '/components'
      fullPath: '/components'
      preLoaderRoute: typeof ComponentsLazyImport
      parentRoute: typeof rootRoute
    }
    '/privacy-policy': {
      id: '/privacy-policy'
      path: '/privacy-policy'
      fullPath: '/privacy-policy'
      preLoaderRoute: typeof PrivacyPolicyLazyImport
      parentRoute: typeof rootRoute
    }
    '/_auth/find-a-friend': {
      id: '/_auth/find-a-friend'
      path: '/find-a-friend'
      fullPath: '/find-a-friend'
      preLoaderRoute: typeof AuthFindAFriendImport
      parentRoute: typeof AuthImport
    }
    '/_auth/login': {
      id: '/_auth/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof AuthLoginImport
      parentRoute: typeof AuthImport
    }
    '/_user/accept-invite': {
      id: '/_user/accept-invite'
      path: '/accept-invite'
      fullPath: '/accept-invite'
      preLoaderRoute: typeof UserAcceptInviteImport
      parentRoute: typeof UserImport
    }
    '/_user/friends': {
      id: '/_user/friends'
      path: '/friends'
      fullPath: '/friends'
      preLoaderRoute: typeof UserFriendsImport
      parentRoute: typeof UserImport
    }
    '/_user/getting-started': {
      id: '/_user/getting-started'
      path: '/getting-started'
      fullPath: '/getting-started'
      preLoaderRoute: typeof UserGettingStartedImport
      parentRoute: typeof UserImport
    }
    '/_user/profile': {
      id: '/_user/profile'
      path: '/profile'
      fullPath: '/profile'
      preLoaderRoute: typeof UserProfileImport
      parentRoute: typeof UserImport
    }
    '/learn/$lang': {
      id: '/learn/$lang'
      path: '/$lang'
      fullPath: '/learn/$lang'
      preLoaderRoute: typeof LearnLangImport
      parentRoute: typeof LearnImport
    }
    '/learn/add-deck': {
      id: '/learn/add-deck'
      path: '/add-deck'
      fullPath: '/learn/add-deck'
      preLoaderRoute: typeof LearnAddDeckImport
      parentRoute: typeof LearnImport
    }
    '/learn/quick-search': {
      id: '/learn/quick-search'
      path: '/quick-search'
      fullPath: '/learn/quick-search'
      preLoaderRoute: typeof LearnQuickSearchImport
      parentRoute: typeof LearnImport
    }
    '/_auth/forgot-password': {
      id: '/_auth/forgot-password'
      path: '/forgot-password'
      fullPath: '/forgot-password'
      preLoaderRoute: typeof AuthForgotPasswordLazyImport
      parentRoute: typeof AuthImport
    }
    '/_auth/set-new-password': {
      id: '/_auth/set-new-password'
      path: '/set-new-password'
      fullPath: '/set-new-password'
      preLoaderRoute: typeof AuthSetNewPasswordLazyImport
      parentRoute: typeof AuthImport
    }
    '/_auth/signup': {
      id: '/_auth/signup'
      path: '/signup'
      fullPath: '/signup'
      preLoaderRoute: typeof AuthSignupLazyImport
      parentRoute: typeof AuthImport
    }
    '/learn/': {
      id: '/learn/'
      path: '/'
      fullPath: '/learn/'
      preLoaderRoute: typeof LearnIndexImport
      parentRoute: typeof LearnImport
    }
    '/_user/friends/$uid': {
      id: '/_user/friends/$uid'
      path: '/$uid'
      fullPath: '/friends/$uid'
      preLoaderRoute: typeof UserFriendsUidImport
      parentRoute: typeof UserFriendsImport
    }
    '/_user/friends/invite': {
      id: '/_user/friends/invite'
      path: '/invite'
      fullPath: '/friends/invite'
      preLoaderRoute: typeof UserFriendsInviteImport
      parentRoute: typeof UserFriendsImport
    }
    '/_user/friends/search': {
      id: '/_user/friends/search'
      path: '/search'
      fullPath: '/friends/search'
      preLoaderRoute: typeof UserFriendsSearchImport
      parentRoute: typeof UserFriendsImport
    }
    '/_user/profile/change-email': {
      id: '/_user/profile/change-email'
      path: '/change-email'
      fullPath: '/profile/change-email'
      preLoaderRoute: typeof UserProfileChangeEmailImport
      parentRoute: typeof UserProfileImport
    }
    '/_user/profile/change-password': {
      id: '/_user/profile/change-password'
      path: '/change-password'
      fullPath: '/profile/change-password'
      preLoaderRoute: typeof UserProfileChangePasswordImport
      parentRoute: typeof UserProfileImport
    }
    '/learn/$lang/add-phrase': {
      id: '/learn/$lang/add-phrase'
      path: '/add-phrase'
      fullPath: '/learn/$lang/add-phrase'
      preLoaderRoute: typeof LearnLangAddPhraseImport
      parentRoute: typeof LearnLangImport
    }
    '/learn/$lang/deck-settings': {
      id: '/learn/$lang/deck-settings'
      path: '/deck-settings'
      fullPath: '/learn/$lang/deck-settings'
      preLoaderRoute: typeof LearnLangDeckSettingsImport
      parentRoute: typeof LearnLangImport
    }
    '/learn/$lang/public-library': {
      id: '/learn/$lang/public-library'
      path: '/public-library'
      fullPath: '/learn/$lang/public-library'
      preLoaderRoute: typeof LearnLangPublicLibraryImport
      parentRoute: typeof LearnLangImport
    }
    '/learn/$lang/review': {
      id: '/learn/$lang/review'
      path: '/review'
      fullPath: '/learn/$lang/review'
      preLoaderRoute: typeof LearnLangReviewImport
      parentRoute: typeof LearnLangImport
    }
    '/learn/$lang/search': {
      id: '/learn/$lang/search'
      path: '/search'
      fullPath: '/learn/$lang/search'
      preLoaderRoute: typeof LearnLangSearchImport
      parentRoute: typeof LearnLangImport
    }
    '/_user/friends/': {
      id: '/_user/friends/'
      path: '/'
      fullPath: '/friends/'
      preLoaderRoute: typeof UserFriendsIndexImport
      parentRoute: typeof UserFriendsImport
    }
    '/_user/profile/': {
      id: '/_user/profile/'
      path: '/'
      fullPath: '/profile/'
      preLoaderRoute: typeof UserProfileIndexImport
      parentRoute: typeof UserProfileImport
    }
    '/learn/$lang/': {
      id: '/learn/$lang/'
      path: '/'
      fullPath: '/learn/$lang/'
      preLoaderRoute: typeof LearnLangIndexImport
      parentRoute: typeof LearnLangImport
    }
    '/_user/friends/search/$uid': {
      id: '/_user/friends/search/$uid'
      path: '/$uid'
      fullPath: '/friends/search/$uid'
      preLoaderRoute: typeof UserFriendsSearchUidImport
      parentRoute: typeof UserFriendsSearchImport
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren({
  IndexLazyRoute,
  AuthRoute: AuthRoute.addChildren({
    AuthFindAFriendRoute,
    AuthLoginRoute,
    AuthForgotPasswordLazyRoute,
    AuthSetNewPasswordLazyRoute,
    AuthSignupLazyRoute,
  }),
  UserRoute: UserRoute.addChildren({
    UserAcceptInviteRoute,
    UserFriendsRoute: UserFriendsRoute.addChildren({
      UserFriendsUidRoute,
      UserFriendsInviteRoute,
      UserFriendsSearchRoute: UserFriendsSearchRoute.addChildren({
        UserFriendsSearchUidRoute,
      }),
      UserFriendsIndexRoute,
    }),
    UserGettingStartedRoute,
    UserProfileRoute: UserProfileRoute.addChildren({
      UserProfileChangeEmailRoute,
      UserProfileChangePasswordRoute,
      UserProfileIndexRoute,
    }),
  }),
  LearnRoute: LearnRoute.addChildren({
    LearnLangRoute: LearnLangRoute.addChildren({
      LearnLangAddPhraseRoute,
      LearnLangDeckSettingsRoute,
      LearnLangPublicLibraryRoute,
      LearnLangReviewRoute,
      LearnLangSearchRoute,
      LearnLangIndexRoute,
    }),
    LearnAddDeckRoute,
    LearnQuickSearchRoute,
    LearnIndexRoute,
  }),
  ComponentsLazyRoute,
  PrivacyPolicyLazyRoute,
})

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/_auth",
        "/_user",
        "/learn",
        "/components",
        "/privacy-policy"
      ]
    },
    "/": {
      "filePath": "index.lazy.tsx"
    },
    "/_auth": {
      "filePath": "_auth.tsx",
      "children": [
        "/_auth/find-a-friend",
        "/_auth/login",
        "/_auth/forgot-password",
        "/_auth/set-new-password",
        "/_auth/signup"
      ]
    },
    "/_user": {
      "filePath": "_user.tsx",
      "children": [
        "/_user/accept-invite",
        "/_user/friends",
        "/_user/getting-started",
        "/_user/profile"
      ]
    },
    "/learn": {
      "filePath": "learn.tsx",
      "children": [
        "/learn/$lang",
        "/learn/add-deck",
        "/learn/quick-search",
        "/learn/"
      ]
    },
    "/components": {
      "filePath": "components.lazy.tsx"
    },
    "/privacy-policy": {
      "filePath": "privacy-policy.lazy.tsx"
    },
    "/_auth/find-a-friend": {
      "filePath": "_auth/find-a-friend.tsx",
      "parent": "/_auth"
    },
    "/_auth/login": {
      "filePath": "_auth/login.tsx",
      "parent": "/_auth"
    },
    "/_user/accept-invite": {
      "filePath": "_user/accept-invite.tsx",
      "parent": "/_user"
    },
    "/_user/friends": {
      "filePath": "_user/friends.tsx",
      "parent": "/_user",
      "children": [
        "/_user/friends/$uid",
        "/_user/friends/invite",
        "/_user/friends/search",
        "/_user/friends/"
      ]
    },
    "/_user/getting-started": {
      "filePath": "_user/getting-started.tsx",
      "parent": "/_user"
    },
    "/_user/profile": {
      "filePath": "_user/profile.tsx",
      "parent": "/_user",
      "children": [
        "/_user/profile/change-email",
        "/_user/profile/change-password",
        "/_user/profile/"
      ]
    },
    "/learn/$lang": {
      "filePath": "learn/$lang.tsx",
      "parent": "/learn",
      "children": [
        "/learn/$lang/add-phrase",
        "/learn/$lang/deck-settings",
        "/learn/$lang/public-library",
        "/learn/$lang/review",
        "/learn/$lang/search",
        "/learn/$lang/"
      ]
    },
    "/learn/add-deck": {
      "filePath": "learn/add-deck.tsx",
      "parent": "/learn"
    },
    "/learn/quick-search": {
      "filePath": "learn/quick-search.tsx",
      "parent": "/learn"
    },
    "/_auth/forgot-password": {
      "filePath": "_auth/forgot-password.lazy.tsx",
      "parent": "/_auth"
    },
    "/_auth/set-new-password": {
      "filePath": "_auth/set-new-password.lazy.tsx",
      "parent": "/_auth"
    },
    "/_auth/signup": {
      "filePath": "_auth/signup.lazy.tsx",
      "parent": "/_auth"
    },
    "/learn/": {
      "filePath": "learn/index.tsx",
      "parent": "/learn"
    },
    "/_user/friends/$uid": {
      "filePath": "_user/friends.$uid.tsx",
      "parent": "/_user/friends"
    },
    "/_user/friends/invite": {
      "filePath": "_user/friends.invite.tsx",
      "parent": "/_user/friends"
    },
    "/_user/friends/search": {
      "filePath": "_user/friends.search.tsx",
      "parent": "/_user/friends",
      "children": [
        "/_user/friends/search/$uid"
      ]
    },
    "/_user/profile/change-email": {
      "filePath": "_user/profile.change-email.tsx",
      "parent": "/_user/profile"
    },
    "/_user/profile/change-password": {
      "filePath": "_user/profile.change-password.tsx",
      "parent": "/_user/profile"
    },
    "/learn/$lang/add-phrase": {
      "filePath": "learn/$lang/add-phrase.tsx",
      "parent": "/learn/$lang"
    },
    "/learn/$lang/deck-settings": {
      "filePath": "learn/$lang/deck-settings.tsx",
      "parent": "/learn/$lang"
    },
    "/learn/$lang/public-library": {
      "filePath": "learn/$lang/public-library.tsx",
      "parent": "/learn/$lang"
    },
    "/learn/$lang/review": {
      "filePath": "learn/$lang/review.tsx",
      "parent": "/learn/$lang"
    },
    "/learn/$lang/search": {
      "filePath": "learn/$lang/search.tsx",
      "parent": "/learn/$lang"
    },
    "/_user/friends/": {
      "filePath": "_user/friends.index.tsx",
      "parent": "/_user/friends"
    },
    "/_user/profile/": {
      "filePath": "_user/profile.index.tsx",
      "parent": "/_user/profile"
    },
    "/learn/$lang/": {
      "filePath": "learn/$lang/index.tsx",
      "parent": "/learn/$lang"
    },
    "/_user/friends/search/$uid": {
      "filePath": "_user/friends.search.$uid.tsx",
      "parent": "/_user/friends/search"
    }
  }
}
ROUTE_MANIFEST_END */
