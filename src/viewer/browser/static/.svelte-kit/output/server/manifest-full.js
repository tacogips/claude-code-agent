export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.r4wYwQkJ.js",app:"_app/immutable/entry/app.2MClsWXy.js",imports:["_app/immutable/entry/start.r4wYwQkJ.js","_app/immutable/chunks/Byozvddc.js","_app/immutable/chunks/BdOuIAID.js","_app/immutable/chunks/3zZajnNw.js","_app/immutable/chunks/Vf_yHKtD.js","_app/immutable/chunks/doQ7eLhh.js","_app/immutable/chunks/_dUXBRNs.js","_app/immutable/entry/app.2MClsWXy.js","_app/immutable/chunks/BdOuIAID.js","_app/immutable/chunks/3zZajnNw.js","_app/immutable/chunks/GQZyshw8.js","_app/immutable/chunks/BgbN6ji0.js","_app/immutable/chunks/doQ7eLhh.js","_app/immutable/chunks/DeVvsqkQ.js","_app/immutable/chunks/ZadwNvFg.js","_app/immutable/chunks/_dUXBRNs.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/queues",
				pattern: /^\/queues\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/queues/[id]",
				pattern: /^\/queues\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/sessions/[id]",
				pattern: /^\/sessions\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
