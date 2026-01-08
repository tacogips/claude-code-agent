
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/queues" | "/queues/[id]" | "/sessions" | "/sessions/[id]";
		RouteParams(): {
			"/queues/[id]": { id: string };
			"/sessions/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/queues": { id?: string };
			"/queues/[id]": { id: string };
			"/sessions": { id?: string };
			"/sessions/[id]": { id: string }
		};
		Pathname(): "/" | "/queues" | "/queues/" | `/queues/${string}` & {} | `/queues/${string}/` & {} | "/sessions" | "/sessions/" | `/sessions/${string}` & {} | `/sessions/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | string & {};
	}
}