import { NFT } from '../../types/models/NFT'

export class NFTHandler {
  static async ensureNFT (id: string, classId: number, tokenId: number) {
    const nft = await NFT.get(id)

    if (!nft) {
      const nft = new NFT(id)
      nft.classId = classId
      nft.tokenId = tokenId

      await nft.save()
    }
  }
}