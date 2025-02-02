type IUnifiactionKey = "method" | "body" | "queryParams" | "headers" | "ip" | "statusCode" | "occured" | "path";

export type IUnificationParams={
  files: string[];
  values:IUnifiactionKey[]
  remove:boolean
}

