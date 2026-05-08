import { create } from 'kubo-rpc-client'
import type { KuboRPCClient } from 'kubo-rpc-client'
import { NFTMetadata, IPFSUploadResult } from '../types'

class IPFSService {
  private client: KuboRPCClient | null = null
  private gateway: string = 'https://ipfs.io/ipfs/'

  constructor() {
    this.initializeClient()
  }

  private initializeClient() {
    try {
      this.client = create({
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
          authorization: 'Basic ' + btoa('2VUvBpN5xOZhyLCPFXK7zYCaIqc' + ':' + '4bb8e5c91e82a27c1dbb1d82a4d29fc6')
        }
      })
    } catch (error) {
      console.error('Failed to initialize IPFS client:', error)
    }
  }

  async uploadJSON(data: any): Promise<IPFSUploadResult> {
    if (!this.client) {
      throw new Error('IPFS client not initialized')
    }

    try {
      const jsonString = JSON.stringify(data, null, 2)
      const result = await this.client.add(jsonString)
      
      return {
        cid: result.cid.toString(),
        path: result.path,
        size: result.size,
        url: `${this.gateway}${result.cid.toString()}`
      }
    } catch (error) {
      console.error('Failed to upload JSON to IPFS:', error)
      throw new Error(`IPFS upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async uploadImage(imageBlob: Blob): Promise<IPFSUploadResult> {
    if (!this.client) {
      throw new Error('IPFS client not initialized')
    }

    try {
      const buffer = await imageBlob.arrayBuffer()
      const result = await this.client.add(new Uint8Array(buffer))
      
      return {
        cid: result.cid.toString(),
        path: result.path,
        size: result.size,
        url: `${this.gateway}${result.cid.toString()}`
      }
    } catch (error) {
      console.error('Failed to upload image to IPFS:', error)
      throw new Error(`IPFS image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async generateNFTImage(metadata: {
    eventTitle: string
    agentName: string
    date: number
    niche?: string
    agentLevel?: number
    evolutionStage?: 'standard' | 'advanced' | 'elite' | 'wisdom'
  }): Promise<Blob> {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 800
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to create canvas context')
    }

    const level = metadata.agentLevel || 1
    const stage = metadata.evolutionStage || 'standard'
    
    let primaryColor = '#00f3ff'
    let secondaryColor = '#9d00ff'
    let tertiaryColor = '#1a1b3a'
    let glowIntensity = 0.3
    
    if (stage === 'wisdom') {
      primaryColor = '#ffd700'
      secondaryColor = '#ff8c00'
      tertiaryColor = '#2d1810'
      glowIntensity = 0.5
    } else if (stage === 'elite') {
      primaryColor = '#00f3ff'
      secondaryColor = '#ff00ff'
      tertiaryColor = '#1a0d2e'
      glowIntensity = 0.4
    } else if (stage === 'advanced') {
      primaryColor = '#00f3ff'
      secondaryColor = '#9d00ff'
      tertiaryColor = '#1a1b3a'
      glowIntensity = 0.35
    }

    const gradient = ctx.createLinearGradient(0, 0, 800, 800)
    gradient.addColorStop(0, '#0d0d1f')
    gradient.addColorStop(0.5, tertiaryColor)
    gradient.addColorStop(1, '#0d0d1f')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 800, 800)

    ctx.strokeStyle = `rgba(${stage === 'wisdom' ? '255, 215, 0' : '0, 243, 255'}, ${glowIntensity})`
    ctx.lineWidth = 2
    for (let i = 0; i < 800; i += 60) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 800)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(800, i)
      ctx.stroke()
    }

    const accentGradient = ctx.createRadialGradient(400, 400, 0, 400, 400, 400)
    accentGradient.addColorStop(0, `${primaryColor}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`)
    accentGradient.addColorStop(0.5, `${secondaryColor}${Math.floor(glowIntensity * 128).toString(16).padStart(2, '0')}`)
    accentGradient.addColorStop(1, 'transparent')
    ctx.fillStyle = accentGradient
    ctx.fillRect(0, 0, 800, 800)

    ctx.shadowColor = primaryColor
    ctx.shadowBlur = stage === 'wisdom' ? 30 : 20
    ctx.strokeStyle = primaryColor
    ctx.lineWidth = stage === 'wisdom' ? 4 : 3
    ctx.strokeRect(60, 60, 680, 680)
    
    if (stage === 'elite' || stage === 'wisdom') {
      ctx.strokeRect(70, 70, 660, 660)
    }
    ctx.shadowBlur = 0

    if (stage === 'wisdom') {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.1)'
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.arc(100 + i * 150, 100, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(150 + i * 150, 700, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.fillStyle = primaryColor
    ctx.font = 'bold 48px "Space Grotesk", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('MAEF', 400, 140)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '20px "JetBrains Mono", monospace'
    ctx.fillText(stage === 'wisdom' ? 'Wisdom Attestation' : 'Proof of Attendance', 400, 180)

    if (level > 1) {
      ctx.fillStyle = secondaryColor
      ctx.font = 'bold 16px "Space Grotesk", sans-serif'
      ctx.fillText(`LEVEL ${level}`, 400, 210)
    }

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 32px "Space Grotesk", sans-serif'
    const titleMaxWidth = 600
    const titleWords = metadata.eventTitle.split(' ')
    let titleLine = ''
    let titleY = 320
    
    for (const word of titleWords) {
      const testLine = titleLine + word + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > titleMaxWidth && titleLine !== '') {
        ctx.fillText(titleLine, 400, titleY)
        titleLine = word + ' '
        titleY += 40
      } else {
        titleLine = testLine
      }
    }
    ctx.fillText(titleLine, 400, titleY)

    ctx.fillStyle = secondaryColor
    ctx.font = '24px "Space Grotesk", sans-serif'
    ctx.fillText(metadata.agentName, 400, 500)

    const dateStr = new Date(metadata.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '18px "Inter", sans-serif'
    ctx.fillText(dateStr, 400, 540)

    if (metadata.niche) {
      ctx.fillStyle = `rgba(${stage === 'wisdom' ? '255, 215, 0' : '0, 243, 255'}, 0.8)`
      ctx.font = '16px "JetBrains Mono", monospace'
      ctx.fillText(metadata.niche.toUpperCase(), 400, 580)
    }

    ctx.strokeStyle = `rgba(${stage === 'wisdom' ? '255, 215, 0' : '0, 243, 255'}, 0.5)`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(400, 680, 60, 0, Math.PI * 2)
    ctx.stroke()
    
    ctx.fillStyle = primaryColor
    ctx.font = 'bold 16px "Space Grotesk", sans-serif'
    ctx.fillText('MANTLE', 400, 675)
    ctx.font = '12px "JetBrains Mono", monospace'
    ctx.fillText('NETWORK', 400, 695)

    if (stage === 'wisdom') {
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(400, 680, 75, 0, Math.PI * 2)
      ctx.stroke()
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to generate image blob'))
        }
      }, 'image/png')
    })
  }

  async createNFTMetadata(params: {
    eventTitle: string
    eventUrl: string
    summary: string
    agentName: string
    agentId: string
    platform: string
    date: number
    tokenId: string
    niche?: string
    agentLevel?: number
    evolutionStage?: 'standard' | 'advanced' | 'elite' | 'wisdom'
  }): Promise<{ metadata: NFTMetadata; metadataCID: string; imageCID: string }> {
    const imageBlob = await this.generateNFTImage({
      eventTitle: params.eventTitle,
      agentName: params.agentName,
      date: params.date,
      niche: params.niche,
      agentLevel: params.agentLevel,
      evolutionStage: params.evolutionStage
    })

    const imageResult = await this.uploadImage(imageBlob)

    const attributes = [
      {
        trait_type: 'Event Title',
        value: params.eventTitle
      },
      {
        trait_type: 'Agent Name',
        value: params.agentName
      },
      {
        trait_type: 'Agent ID',
        value: params.agentId
      },
      {
        trait_type: 'Platform',
        value: params.platform
      },
      {
        trait_type: 'Attendance Date',
        value: new Date(params.date).toISOString()
      },
      {
        trait_type: 'Token ID',
        value: params.tokenId
      }
    ]

    if (params.agentLevel) {
      attributes.push({
        trait_type: 'Agent Level',
        value: params.agentLevel.toString()
      })
    }

    if (params.evolutionStage) {
      attributes.push({
        trait_type: 'Evolution Stage',
        value: params.evolutionStage.toUpperCase()
      })
    }

    const metadata: NFTMetadata = {
      name: `${params.eventTitle} - ${params.evolutionStage === 'wisdom' ? 'Wisdom Attestation' : 'Proof of Attendance'}`,
      description: `This NFT certifies that AI Agent "${params.agentName}" ${params.evolutionStage === 'wisdom' ? '(Wisdom Unlocked)' : ''} attended and analyzed the event: "${params.eventTitle}". ${params.summary}`,
      image: imageResult.url,
      external_url: params.eventUrl,
      attributes,
      properties: {
        event_url: params.eventUrl,
        summary: params.summary,
        agent_id: params.agentId,
        minted_by: 'MAEF',
        network: 'Mantle',
        category: params.niche || 'General'
      }
    }

    if (params.niche) {
      metadata.attributes.push({
        trait_type: 'Niche',
        value: params.niche
      })
    }

    const metadataResult = await this.uploadJSON(metadata)

    return {
      metadata,
      metadataCID: metadataResult.cid,
      imageCID: imageResult.cid
    }
  }

  async retrieveMetadata(cid: string): Promise<any> {
    if (!this.client) {
      throw new Error('IPFS client not initialized')
    }

    try {
      const chunks = []
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk)
      }
      
      const decoder = new TextDecoder()
      const jsonString = decoder.decode(Buffer.concat(chunks))
      return JSON.parse(jsonString)
    } catch (error) {
      console.error('Failed to retrieve metadata from IPFS:', error)
      throw new Error(`IPFS retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async batchCreateNFTMetadata(
    batchParams: Array<{
      eventTitle: string
      eventUrl: string
      summary: string
      agentName: string
      agentId: string
      platform: string
      date: number
      tokenId: string
      niche?: string
    }>,
    onProgress?: (current: number, total: number, itemTitle: string) => void
  ): Promise<Array<{ metadata: NFTMetadata; metadataCID: string; imageCID: string; index: number }>> {
    const results: Array<{ metadata: NFTMetadata; metadataCID: string; imageCID: string; index: number }> = []
    const total = batchParams.length

    for (let i = 0; i < batchParams.length; i++) {
      const params = batchParams[i]
      
      if (onProgress) {
        onProgress(i + 1, total, params.eventTitle)
      }

      try {
        const result = await this.createNFTMetadata(params)
        results.push({
          ...result,
          index: i
        })
      } catch (error) {
        console.error(`Failed to create metadata for item ${i + 1}:`, error)
        throw new Error(`Batch upload failed at item ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return results
  }

  async batchUploadImages(
    imageBlobs: Array<{ blob: Blob; metadata: any }>,
    onProgress?: (current: number, total: number) => void
  ): Promise<Array<IPFSUploadResult>> {
    const results: Array<IPFSUploadResult> = []
    const total = imageBlobs.length

    for (let i = 0; i < imageBlobs.length; i++) {
      const { blob } = imageBlobs[i]
      
      if (onProgress) {
        onProgress(i + 1, total)
      }

      try {
        const result = await this.uploadImage(blob)
        results.push(result)
      } catch (error) {
        console.error(`Failed to upload image ${i + 1}:`, error)
        throw new Error(`Batch image upload failed at item ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return results
  }

  async batchUploadJSON(
    jsonData: Array<any>,
    onProgress?: (current: number, total: number) => void
  ): Promise<Array<IPFSUploadResult>> {
    const results: Array<IPFSUploadResult> = []
    const total = jsonData.length

    for (let i = 0; i < jsonData.length; i++) {
      const data = jsonData[i]
      
      if (onProgress) {
        onProgress(i + 1, total)
      }

      try {
        const result = await this.uploadJSON(data)
        results.push(result)
      } catch (error) {
        console.error(`Failed to upload JSON ${i + 1}:`, error)
        throw new Error(`Batch JSON upload failed at item ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return results
  }

  getGatewayUrl(cid: string): string {
    return `${this.gateway}${cid}`
  }

  isInitialized(): boolean {
    return this.client !== null
  }
}

export const ipfsService = new IPFSService()
