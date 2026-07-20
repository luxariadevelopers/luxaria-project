import { maskMongoUri } from './mask-mongo-uri';

describe('maskMongoUri', () => {
  it('masks username and password in mongodb+srv URIs', () => {
    const masked = maskMongoUri(
      'mongodb+srv://luxaria_app:s3cretPass@cluster0.abc.mongodb.net/luxaria-erp?retryWrites=true',
    );

    expect(masked).toContain('***');
    expect(masked).not.toContain('luxaria_app');
    expect(masked).not.toContain('s3cretPass');
    expect(masked).toContain('cluster0.abc.mongodb.net');
  });

  it('masks credentials in standard mongodb URIs', () => {
    const masked = maskMongoUri('mongodb://admin:hunter2@127.0.0.1:9017/luxaria-erp');
    expect(masked).not.toContain('admin');
    expect(masked).not.toContain('hunter2');
    expect(masked).toContain('127.0.0.1');
  });
});
