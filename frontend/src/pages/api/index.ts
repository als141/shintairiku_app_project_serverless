import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // アプリケーションの状態をチェック
  res.status(200).json({
    status: 'online',
    message: 'コンテンツ自動生成APIへようこそ'
  });
}