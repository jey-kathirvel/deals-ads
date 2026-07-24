import type {
  ProviderDocument,
  ProviderHttpClient,
} from "../contracts";

export class ProviderDocumentLoader {

  constructor(
    private readonly httpClient: ProviderHttpClient,
  ) {}

  async load(
    url: string,
  ): Promise<ProviderDocument> {

    const response =
      await this.httpClient.request({
        url,
      });

    return {
      url: response.url,
      html: response.body,
      fetchedAt: new Date(),
      status: response.status,
      contentType:
        response.headers["content-type"] ?? "",
      size:
        Buffer.byteLength(
          response.body,
          "utf8",
        ),
      durationMs:
        response.durationMs,
    };
  }

  async loadMany(
    urls: readonly string[],
  ): Promise<ProviderDocument[]> {

    const documents: ProviderDocument[] = [];

    for (const url of urls) {
      documents.push(
        await this.load(url),
      );
    }

    return documents;
  }
}
