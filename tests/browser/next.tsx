export function useRouter(){return {refresh:()=>{},push:(href:string)=>history.pushState({},'',href),replace:(href:string)=>history.replaceState({},'',href)}}
export default function Link({href,children,...props}:any){return <a href={href} {...props}>{children}</a>}
