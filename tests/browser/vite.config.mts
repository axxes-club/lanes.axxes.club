import {fileURLToPath} from 'node:url'
const root=fileURLToPath(new URL('../../',import.meta.url))
const actions=root+'tests/browser/actions.ts'
export default {root,esbuild:{jsx:'automatic'},resolve:{alias:[...['actions','bulk-actions','field-actions','view-actions','settings-actions','link-actions'].map(name=>({find:`@/lib/lanes/${name}`,replacement:actions})),{find:/^\.\/poker-panel$/,replacement:actions},{find:'@/components/lanes/poker-panel',replacement:actions},{find:'next/navigation',replacement:root+'tests/browser/next.tsx'},{find:'next/link',replacement:root+'tests/browser/next.tsx'},{find:'@',replacement:root+'src'}]},server:{host:'127.0.0.1',port:3299}}
