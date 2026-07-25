declare module "cloudflare:workers" {
  /**
   * Cloudflare injects runtime bindings such as D1 through this object.
   *
   * Binding-specific types are intentionally permissive here because the
   * deployment control plane generates the actual environment bindings.
   */
  export const env: {
    DB?: any;
    [binding: string]: any;
  };
}
