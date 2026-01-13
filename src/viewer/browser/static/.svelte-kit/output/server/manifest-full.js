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
		client: {start:"_app/immutable/entry/start.Ce1eEG4w.js",app:"_app/immutable/entry/app.BPMXZWZW.js",imports:["_app/immutable/entry/start.Ce1eEG4w.js","_app/immutable/chunks/CtuF2K4Y.js","_app/immutable/chunks/CCKomhIj.js","_app/immutable/chunks/BRu-t6t3.js","_app/immutable/chunks/C7IsyxOp.js","_app/immutable/entry/app.BPMXZWZW.js","_app/immutable/chunks/CCKomhIj.js","_app/immutable/chunks/BRu-t6t3.js","_app/immutable/chunks/loHFRAW_.js","_app/immutable/chunks/B7jzjk1J.js","_app/immutable/chunks/CTx3u__L.js","_app/immutable/chunks/DaK8EgOz.js","_app/immutable/chunks/Cr0wacYL.js","_app/immutable/chunks/C7IsyxOp.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
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
