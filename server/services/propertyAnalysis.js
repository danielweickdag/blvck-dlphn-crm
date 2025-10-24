const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const Property = require('../models/Property');

class PropertyAnalysisService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Main analysis function
  async analyzeProperty(address, offerAmount = null) {
    try {
      console.log(`Starting analysis for: ${address}`);
      
      // Step 1: Get basic property data
      const propertyData = await this.getPropertyData(address);
      
      // Step 2: Get comparable sales
      const comparables = await this.getComparables(address);
      
      // Step 3: Get Zillow data
      const zillowData = await this.getZillowData(address);
      
      // Step 4: Get Realtor.com data
      const realtorData = await this.getRealtorData(address);
      
      // Step 5: Calculate investment metrics
      const investmentAnalysis = await this.calculateInvestmentMetrics({
        ...propertyData,
        comparables,
        zillowData,
        realtorData,
        offerAmount
      });
      
      // Step 6: AI Analysis
      const aiInsights = await this.getAIAnalysis({
        ...propertyData,
        comparables,
        investmentAnalysis,
        offerAmount
      });
      
      // Step 7: Funding analysis
      const fundingOptions = await this.analyzeFundingOptions(propertyData, investmentAnalysis);
      
      // Compile complete analysis
      const completeAnalysis = {
        ...propertyData,
        comparables,
        zillowData,
        realtorData,
        analysis: investmentAnalysis,
        aiInsights,
        fundingOptions,
        lastAnalyzed: new Date()
      };
      
      // Save to database
      await this.savePropertyAnalysis(address, completeAnalysis);
      
      return completeAnalysis;
      
    } catch (error) {
      console.error('Property analysis error:', error);
      throw new Error(`Failed to analyze property: ${error.message}`);
    }
  }

  // Get basic property information
  async getPropertyData(address) {
    try {
      // This would integrate with county records, MLS, etc.
      // For now, we'll use a mock structure
      return {
        address: address,
        propertyType: 'single_family',
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1500,
        lotSize: 0.25,
        yearBuilt: 1985,
        condition: 'fair'
      };
    } catch (error) {
      console.error('Error getting property data:', error);
      return {};
    }
  }

  // Get comparable sales data
  async getComparables(address) {
    try {
      // This would integrate with MLS APIs or web scraping
      // Mock data for demonstration
      return [
        {
          address: "123 Similar St",
          soldPrice: 285000,
          soldDate: new Date('2024-01-15'),
          squareFootage: 1450,
          bedrooms: 3,
          bathrooms: 2,
          distance: 0.3,
          pricePerSqFt: 196.55,
          daysOnMarket: 25
        },
        {
          address: "456 Nearby Ave",
          soldPrice: 295000,
          soldDate: new Date('2024-02-01'),
          squareFootage: 1520,
          bedrooms: 3,
          bathrooms: 2,
          distance: 0.5,
          pricePerSqFt: 194.08,
          daysOnMarket: 18
        },
        {
          address: "789 Close Rd",
          soldPrice: 275000,
          soldDate: new Date('2024-01-28'),
          squareFootage: 1480,
          bedrooms: 3,
          bathrooms: 2,
          distance: 0.4,
          pricePerSqFt: 185.81,
          daysOnMarket: 32
        }
      ];
    } catch (error) {
      console.error('Error getting comparables:', error);
      return [];
    }
  }

  // Get Zillow data
  async getZillowData(address) {
    try {
      // This would use Zillow's API or web scraping
      // Mock data for demonstration
      return {
        zestimate: 290000,
        rentZestimate: 2200,
        priceHistory: [
          { date: '2023-01-01', price: 275000, event: 'Listed' },
          { date: '2023-02-15', price: 270000, event: 'Price change' },
          { date: '2023-03-01', price: 265000, event: 'Sold' }
        ],
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting Zillow data:', error);
      return {};
    }
  }

  // Get Realtor.com data
  async getRealtorData(address) {
    try {
      // This would use Realtor.com API or web scraping
      // Mock data for demonstration
      return {
        mlsNumber: 'MLS123456',
        listingStatus: 'Active',
        listPrice: 295000,
        daysOnMarket: 15,
        priceHistory: [
          { date: '2024-01-01', price: 295000, event: 'Listed' }
        ],
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting Realtor data:', error);
      return {};
    }
  }

  // Calculate investment metrics
  async calculateInvestmentMetrics(propertyData) {
    try {
      const { squareFootage, comparables, zillowData, offerAmount } = propertyData;
      
      // Calculate ARV from comparables
      const avgPricePerSqFt = comparables.reduce((sum, comp) => sum + comp.pricePerSqFt, 0) / comparables.length;
      const arv = Math.round(avgPricePerSqFt * squareFootage);
      
      // Estimate rehab costs (this would be more sophisticated in reality)
      const rehabCosts = {
        total: 35000,
        breakdown: {
          kitchen: 12000,
          bathrooms: 8000,
          flooring: 6000,
          paint: 3000,
          roof: 0,
          hvac: 2000,
          plumbing: 1500,
          electrical: 1000,
          windows: 0,
          exterior: 1500,
          other: 0
        }
      };
      
      // Calculate MAO (70% rule)
      const mao = Math.round((arv * 0.7) - rehabCosts.total);
      
      // Wholesale analysis
      const wholesaleFee = 10000;
      const wholesale = {
        buyPrice: offerAmount || mao,
        wholesaleFee: wholesaleFee,
        profit: wholesaleFee,
        roi: wholesaleFee / (offerAmount || mao) * 100
      };
      
      // Rehab analysis
      const rehab = {
        buyPrice: offerAmount || mao,
        rehabCost: rehabCosts.total,
        arv: arv,
        grossProfit: arv - (offerAmount || mao) - rehabCosts.total,
        netProfit: arv - (offerAmount || mao) - rehabCosts.total - (arv * 0.1), // 10% for holding costs, etc.
        roi: ((arv - (offerAmount || mao) - rehabCosts.total) / ((offerAmount || mao) + rehabCosts.total)) * 100
      };
      
      // BRRRR analysis
      const monthlyRent = zillowData.rentZestimate || 2200;
      const monthlyExpenses = monthlyRent * 0.5; // 50% rule
      const refinanceAmount = arv * 0.75; // 75% LTV
      const totalInvested = (offerAmount || mao) + rehabCosts.total;
      const cashLeft = totalInvested - refinanceAmount;
      
      const brrrr = {
        buyPrice: offerAmount || mao,
        rehabCost: rehabCosts.total,
        arv: arv,
        refinanceAmount: refinanceAmount,
        cashLeft: Math.max(cashLeft, 0),
        monthlyRent: monthlyRent,
        monthlyExpenses: monthlyExpenses,
        cashFlow: monthlyRent - monthlyExpenses,
        coc: cashLeft > 0 ? ((monthlyRent - monthlyExpenses) * 12 / cashLeft) * 100 : 0
      };
      
      // Novation analysis
      const novation = {
        currentValue: zillowData.zestimate || arv * 0.9,
        potentialValue: arv,
        improvementCost: rehabCosts.total * 0.5, // Lighter improvements
        profit: (arv - (zillowData.zestimate || arv * 0.9)) * 0.5, // Split profit
        timeframe: 6
      };
      
      return {
        arv,
        asIsValue: zillowData.zestimate || arv * 0.85,
        rehabCosts,
        mao,
        wholesaleFee,
        wholesale,
        rehab,
        brrrr,
        novation
      };
      
    } catch (error) {
      console.error('Error calculating investment metrics:', error);
      throw error;
    }
  }

  // AI Analysis using OpenAI
  async getAIAnalysis(propertyData) {
    try {
      const prompt = `
        Analyze this real estate investment opportunity:
        
        Property: ${propertyData.address}
        Type: ${propertyData.propertyType}
        Size: ${propertyData.squareFootage} sq ft, ${propertyData.bedrooms}/${propertyData.bathrooms}
        Year Built: ${propertyData.yearBuilt}
        Condition: ${propertyData.condition}
        
        Offer Amount: $${propertyData.offerAmount || 'Not specified'}
        ARV: $${propertyData.analysis?.arv}
        MAO: $${propertyData.analysis?.mao}
        Estimated Rehab: $${propertyData.analysis?.rehabCosts?.total}
        
        Comparable Sales:
        ${propertyData.comparables?.map(comp => 
          `- ${comp.address}: $${comp.soldPrice} (${comp.pricePerSqFt}/sq ft, ${comp.daysOnMarket} DOM)`
        ).join('\n')}
        
        Investment Analysis:
        - Wholesale Profit: $${propertyData.analysis?.wholesale?.profit}
        - Rehab Net Profit: $${propertyData.analysis?.rehab?.netProfit}
        - BRRRR Cash Flow: $${propertyData.analysis?.brrrr?.cashFlow}/month
        
        Please provide:
        1. Market analysis and trends
        2. Investment recommendation (Buy/Pass/Negotiate)
        3. Risk assessment
        4. Profit projection confidence
        5. Overall confidence score (1-10)
        
        Keep response concise but comprehensive.
      `;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert real estate investment analyst. Provide detailed, actionable insights for wholesale and investment properties."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const analysis = response.choices[0].message.content;
      
      // Parse the response to extract structured data
      const confidenceMatch = analysis.match(/confidence score.*?(\d+)/i);
      const confidenceScore = confidenceMatch ? parseInt(confidenceMatch[1]) : 7;
      
      return {
        marketAnalysis: analysis,
        investmentRecommendation: this.extractRecommendation(analysis),
        riskAssessment: this.extractRiskFactors(analysis),
        profitProjection: this.extractProfitProjection(analysis),
        confidenceScore: confidenceScore,
        lastAnalyzed: new Date()
      };
      
    } catch (error) {
      console.error('AI Analysis error:', error);
      return {
        marketAnalysis: 'AI analysis temporarily unavailable',
        investmentRecommendation: 'Manual review required',
        riskAssessment: 'Standard due diligence recommended',
        profitProjection: 'Based on comparable analysis',
        confidenceScore: 5,
        lastAnalyzed: new Date()
      };
    }
  }

  // Extract recommendation from AI response
  extractRecommendation(analysis) {
    if (analysis.toLowerCase().includes('buy')) return 'BUY';
    if (analysis.toLowerCase().includes('pass')) return 'PASS';
    if (analysis.toLowerCase().includes('negotiate')) return 'NEGOTIATE';
    return 'REVIEW';
  }

  // Extract risk factors
  extractRiskFactors(analysis) {
    const risks = [];
    if (analysis.toLowerCase().includes('market')) risks.push('Market conditions');
    if (analysis.toLowerCase().includes('rehab')) risks.push('Rehab costs');
    if (analysis.toLowerCase().includes('location')) risks.push('Location factors');
    return risks.length > 0 ? risks.join(', ') : 'Standard investment risks';
  }

  // Extract profit projection
  extractProfitProjection(analysis) {
    if (analysis.toLowerCase().includes('high profit')) return 'High profit potential';
    if (analysis.toLowerCase().includes('moderate')) return 'Moderate profit expected';
    if (analysis.toLowerCase().includes('low profit')) return 'Low profit margins';
    return 'Profit potential varies by strategy';
  }

  // Analyze funding options
  async analyzeFundingOptions(propertyData, investmentAnalysis) {
    const { arv, mao } = investmentAnalysis;
    const ltv75 = arv * 0.75;
    const ltv80 = arv * 0.80;
    
    return {
      hardMoney: {
        eligible: true,
        maxLTV: 75,
        estimatedRate: 12.5,
        maxAmount: ltv75,
        terms: '6-12 months'
      },
      conventional: {
        eligible: propertyData.condition !== 'poor',
        maxLTV: 80,
        estimatedRate: 7.5,
        maxAmount: ltv80,
        terms: '30 years'
      },
      portfolio: {
        eligible: true,
        maxLTV: 75,
        estimatedRate: 8.5,
        maxAmount: ltv75,
        terms: '15-30 years'
      },
      cash: {
        recommended: mao < 200000,
        advantages: ['Quick closing', 'Stronger offers', 'No financing contingencies']
      }
    };
  }

  // Save analysis to database
  async savePropertyAnalysis(address, analysisData) {
    try {
      const existingProperty = await Property.findOne({ address });
      
      if (existingProperty) {
        await Property.findOneAndUpdate(
          { address },
          { ...analysisData, updatedAt: new Date() },
          { new: true }
        );
      } else {
        const newProperty = new Property(analysisData);
        await newProperty.save();
      }
      
      console.log(`Property analysis saved for: ${address}`);
    } catch (error) {
      console.error('Error saving property analysis:', error);
    }
  }
}

module.exports = new PropertyAnalysisService();