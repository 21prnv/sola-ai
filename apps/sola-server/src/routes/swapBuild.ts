import type { Context } from 'hono'
import { z } from 'zod'

import { assetInputSchema } from '../lib/schemas/swapSchemas'
import { executeSwapRouteBuild } from '../tools/initiateSwap'
import { buildWalletContextFromChatFields } from '../utils/chatWalletContext'

const swapBuildRequestSchema = z.object({
  evmAddress: z.string().optional(),
  solanaAddress: z.string().optional(),
  approvedChainIds: z.array(z.string()).optional(),
  safeAddress: z.string().optional(),
  safeDeploymentState: z
    .record(
      z.string(),
      z.object({
        isDeployed: z.boolean(),
        modulesEnabled: z.boolean(),
        domainVerifierSet: z.boolean(),
        safeAddress: z.string(),
      })
    )
    .optional(),
  knownTransactions: z
    .array(
      z.object({
        txHash: z.string(),
        type: z.enum(['swap', 'send', 'limitOrder', 'stopLoss', 'twap', 'deposit', 'withdraw', 'approval']),
        sellSymbol: z.string().optional(),
        sellAmount: z.string().optional(),
        buySymbol: z.string().optional(),
        buyAmount: z.string().optional(),
        network: z.string().optional(),
      })
    )
    .optional(),
  dynamicMultichainAddresses: z.record(z.string(), z.string()).optional(),
  registryOrders: z
    .array(
      z.object({
        orderHash: z.string(),
        chainId: z.number(),
        sellTokenAddress: z.string(),
        sellTokenSymbol: z.string(),
        sellAmountBaseUnit: z.string(),
        sellAmountHuman: z.string(),
        buyTokenAddress: z.string(),
        buyTokenSymbol: z.string(),
        buyAmountHuman: z.string(),
        strikePrice: z.string(),
        validTo: z.number(),
        submitTxHash: z.string(),
        createdAt: z.number(),
        network: z.string(),
        status: z.enum(['open', 'triggered', 'fulfilled', 'cancelled', 'expired', 'failed', 'partiallyFilled']),
        orderType: z.enum(['stopLoss', 'twap']),
        numParts: z.number().optional(),
      })
    )
    .optional(),
  sellAsset: assetInputSchema,
  buyAsset: assetInputSchema,
  sellAmount: z.string().min(1),
  selectedSwapperId: z.string().min(1),
})

export async function handleSwapBuildRequest(c: Context) {
  try {
    const body = await c.req.json()
    const parsed = swapBuildRequestSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body', details: parsed.error.issues }, 400)
    }

    const {
      evmAddress,
      solanaAddress,
      approvedChainIds,
      safeAddress,
      safeDeploymentState,
      knownTransactions,
      dynamicMultichainAddresses,
      registryOrders,
      sellAsset,
      buyAsset,
      sellAmount,
      selectedSwapperId,
    } = parsed.data

    const walletContext = buildWalletContextFromChatFields(
      evmAddress,
      solanaAddress,
      approvedChainIds,
      safeAddress,
      safeDeploymentState,
      registryOrders,
      knownTransactions,
      dynamicMultichainAddresses
    )

    const result = await executeSwapRouteBuild(
      {
        sellAsset,
        buyAsset,
        sellAmountCrypto: sellAmount,
        selectedSwapperId,
      },
      walletContext
    )

    return c.json(result)
  } catch (error) {
    console.error('[Swap build error]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: 'Failed to build swap transaction', message }, 500)
  }
}
