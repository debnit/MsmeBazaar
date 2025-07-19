/**
 * @swagger
 * /api/msme-listings:
 *   get:
 *     tags: [MSME Listings]
 *     summary: Get all MSME listings
 *     description: Retrieves all active MSME listings with pagination and filtering options
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Filter by industry
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum asking price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum asking price
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, sold, pending, inactive]
 *         description: Filter by listing status
 *     responses:
 *       200:
 *         description: MSME listings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MsmeListing'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 10
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     tags: [MSME Listings]
 *     summary: Create new MSME listing
 *     description: Creates a new MSME business listing (seller role required)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - industry
 *               - location
 *               - askingPrice
 *               - revenue
 *               - description
 *             properties:
 *               businessName:
 *                 type: string
 *                 example: "Tech Solutions Pvt Ltd"
 *               industry:
 *                 type: string
 *                 example: "Technology"
 *               location:
 *                 type: string
 *                 example: "Bhubaneswar, Odisha"
 *               askingPrice:
 *                 type: number
 *                 example: 5000000
 *               revenue:
 *                 type: number
 *                 example: 2000000
 *               profit:
 *                 type: number
 *                 example: 500000
 *               employees:
 *                 type: integer
 *                 example: 25
 *               description:
 *                 type: string
 *                 example: "Leading software development company"
 *               assets:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Office equipment", "Software licenses"]
 *               liabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Bank loan", "Vendor payments"]
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["financial_statements.pdf", "registration.pdf"]
 *     responses:
 *       201:
 *         description: MSME listing created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MsmeListing'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - seller role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/msme-listings/{id}:
 *   get:
 *     tags: [MSME Listings]
 *     summary: Get MSME listing by ID
 *     description: Retrieves a specific MSME listing by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MSME listing ID
 *     responses:
 *       200:
 *         description: MSME listing retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MsmeListing'
 *       404:
 *         description: MSME listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags: [MSME Listings]
 *     summary: Update MSME listing
 *     description: Updates an existing MSME listing (owner or admin only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MSME listing ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               industry:
 *                 type: string
 *               location:
 *                 type: string
 *               askingPrice:
 *                 type: number
 *               revenue:
 *                 type: number
 *               profit:
 *                 type: number
 *               employees:
 *                 type: integer
 *               description:
 *                 type: string
 *               assets:
 *                 type: array
 *                 items:
 *                   type: string
 *               liabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [active, sold, pending, inactive]
 *     responses:
 *       200:
 *         description: MSME listing updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MsmeListing'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not authorized to update this listing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: MSME listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: [MSME Listings]
 *     summary: Delete MSME listing
 *     description: Deletes an MSME listing (owner or admin only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MSME listing ID
 *     responses:
 *       200:
 *         description: MSME listing deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not authorized to delete this listing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: MSME listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/msme-listings/{id}/valuation:
 *   post:
 *     tags: [Valuation]
 *     summary: Get AI-powered business valuation
 *     description: Calculates business valuation using machine learning algorithms
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MSME listing ID
 *     responses:
 *       200:
 *         description: Valuation calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 estimatedValue:
 *                   type: number
 *                   example: 4500000
 *                 confidence:
 *                   type: number
 *                   example: 0.85
 *                 factors:
 *                   type: object
 *                   properties:
 *                     financialScore:
 *                       type: number
 *                       example: 0.8
 *                     industryMultiplier:
 *                       type: number
 *                       example: 1.2
 *                     locationFactor:
 *                       type: number
 *                       example: 1.0
 *                     growthPotential:
 *                       type: number
 *                       example: 0.9
 *                     assetQuality:
 *                       type: number
 *                       example: 0.7
 *                     marketPosition:
 *                       type: number
 *                       example: 0.6
 *                     riskFactor:
 *                       type: number
 *                       example: 0.3
 *                     timeToMarket:
 *                       type: number
 *                       example: 0.8
 *                 methodology:
 *                   type: string
 *                   example: "ML-based DCF with industry comparables"
 *                 recommendation:
 *                   type: string
 *                   enum: [undervalued, fairly_valued, overvalued]
 *                   example: "fairly_valued"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: MSME listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Valuation calculation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
