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
		client: {start:"_app/immutable/entry/start.BQGJLGNe.js",app:"_app/immutable/entry/app.CmMg7gyM.js",imports:["_app/immutable/entry/start.BQGJLGNe.js","_app/immutable/chunks/BILOlQV3.js","_app/immutable/chunks/q5j8a02M.js","_app/immutable/chunks/CZouSAYS.js","_app/immutable/entry/app.CmMg7gyM.js","_app/immutable/chunks/q5j8a02M.js","_app/immutable/chunks/CZouSAYS.js","_app/immutable/chunks/DLLKN0vD.js","_app/immutable/chunks/ChFvzTa7.js","_app/immutable/chunks/BPjYD0r0.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js'))
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
