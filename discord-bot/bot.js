const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Import models
const Deal = require('../server/models/Deal');
const Property = require('../server/models/Property');
const User = require('../server/models/User');

// Import services
const propertyAnalysis = require('../server/services/propertyAnalysis');

class DiscordCRMBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
      ]
    });
    
    this.setupEventHandlers();
    this.connectDatabase();
  }

  async connectDatabase() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/discord-crm');
      console.log('✅ MongoDB connected for Discord bot');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
    }
  }

  setupEventHandlers() {
    this.client.once('ready', () => {
      console.log(`🤖 ${this.client.user.tag} is online!`);
      console.log(`🏠 BLVCK DLPHN Investment CRM Bot Ready`);
      this.client.user.setActivity('Real Estate Deals', { type: 'WATCHING' });
    });

    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      
      await this.handleMessage(message);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isButton()) {
        await this.handleButtonInteraction(interaction);
      }
    });
  }

  async handleMessage(message) {
    const content = message.content.toLowerCase();
    const args = message.content.split(' ');
    const command = args[0].toLowerCase();

    try {
      switch (command) {
        case '!analyze':
        case '!deal':
          await this.handleAnalyzeCommand(message, args);
          break;
        
        case '!offer':
          await this.handleOfferCommand(message, args);
          break;
        
        case '!status':
          await this.handleStatusCommand(message, args);
          break;
        
        case '!pipeline':
          await this.handlePipelineCommand(message);
          break;
        
        case '!update':
          await this.handleUpdateCommand(message, args);
          break;
        
        case '!contract':
          await this.handleContractCommand(message, args);
          break;
        
        case '!comps':
          await this.handleCompsCommand(message, args);
          break;
        
        case '!profit':
          await this.handleProfitCommand(message, args);
          break;
        
        case '!help':
          await this.handleHelpCommand(message);
          break;
        
        default:
          // Check if message contains an address
          if (this.isAddress(message.content)) {
            await this.handleAddressDetection(message);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      await message.reply('❌ An error occurred while processing your request.');
    }
  }

  // Analyze property command
  async handleAnalyzeCommand(message, args) {
    if (args.length < 2) {
      return message.reply('❌ Please provide an address. Example: `!analyze 123 Main St, City, State`');
    }

    const address = args.slice(1).join(' ');
    
    const loadingEmbed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🔍 Analyzing Property...')
      .setDescription(`Analyzing: **${address}**\n\n⏳ Gathering data from multiple sources...`)
      .setTimestamp();
    
    const loadingMessage = await message.reply({ embeds: [loadingEmbed] });

    try {
      // Perform comprehensive analysis
      const analysis = await propertyAnalysis.analyzeProperty(address);
      
      // Create new deal
      const deal = new Deal({
        address: address,
        city: analysis.city || 'Unknown',
        state: analysis.state || 'Unknown',
        zipCode: analysis.zipCode || 'Unknown',
        propertyType: analysis.propertyType,
        bedrooms: analysis.bedrooms,
        bathrooms: analysis.bathrooms,
        squareFootage: analysis.squareFootage,
        yearBuilt: analysis.yearBuilt,
        arv: analysis.analysis?.arv,
        mao: analysis.analysis?.mao,
        wholesaleProfit: analysis.analysis?.wholesale?.profit,
        rehabberGrossProfit: analysis.analysis?.rehab?.grossProfit,
        novationPotential: analysis.analysis?.novation?.profit,
        brrrPotential: analysis.analysis?.brrrr?.cashFlow * 12,
        aiAnalysis: analysis.aiInsights,
        zillowData: analysis.zillowData,
        realtorData: analysis.realtorData,
        comparables: analysis.comparables,
        discordUserId: message.author.id,
        discordChannelId: message.channel.id
      });

      await deal.save();

      // Create detailed embed
      const embed = await this.createAnalysisEmbed(deal, analysis);
      
      // Create action buttons
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`offer_${deal._id}`)
            .setLabel('Make Offer')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💰'),
          new ButtonBuilder()
            .setCustomId(`contract_${deal._id}`)
            .setLabel('Generate Contract')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📄'),
          new ButtonBuilder()
            .setCustomId(`update_${deal._id}`)
            .setLabel('Update Status')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄')
        );

      await loadingMessage.edit({ 
        embeds: [embed], 
        components: [actionRow] 
      });

    } catch (error) {
      console.error('Analysis error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Analysis Failed')
        .setDescription(`Failed to analyze: **${address}**\n\nError: ${error.message}`)
        .setTimestamp();
      
      await loadingMessage.edit({ embeds: [errorEmbed] });
    }
  }

  // Handle offer command
  async handleOfferCommand(message, args) {
    if (args.length < 3) {
      return message.reply('❌ Please provide address and offer amount. Example: `!offer 123 Main St $250000`');
    }

    const offerAmount = parseInt(args[args.length - 1].replace(/[$,]/g, ''));
    const address = args.slice(1, -1).join(' ');

    if (isNaN(offerAmount)) {
      return message.reply('❌ Please provide a valid offer amount.');
    }

    try {
      // Find or create deal
      let deal = await Deal.findOne({ address: { $regex: address, $options: 'i' } });
      
      if (!deal) {
        // Create new deal with offer
        const analysis = await propertyAnalysis.analyzeProperty(address, offerAmount);
        deal = new Deal({
          address: address,
          offerAmount: offerAmount,
          status: 'offer_sent',
          // ... other fields from analysis
          discordUserId: message.author.id,
          discordChannelId: message.channel.id
        });
      } else {
        deal.offerAmount = offerAmount;
        deal.status = 'offer_sent';
      }

      deal.activityLog.push({
        action: 'offer_made',
        description: `Offer of $${offerAmount.toLocaleString()} made via Discord`,
        userId: message.author.id
      });

      await deal.save();

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('💰 Offer Submitted')
        .setDescription(`**Address:** ${address}\n**Offer Amount:** $${offerAmount.toLocaleString()}`)
        .addFields(
          { name: 'Deal ID', value: deal.dealId, inline: true },
          { name: 'Status', value: 'Offer Sent', inline: true },
          { name: 'MAO', value: deal.mao ? `$${deal.mao.toLocaleString()}` : 'Calculating...', inline: true }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Offer error:', error);
      await message.reply('❌ Failed to submit offer. Please try again.');
    }
  }

  // Handle status update command
  async handleUpdateCommand(message, args) {
    if (args.length < 3) {
      return message.reply('❌ Usage: `!update [deal-id] [status]`\nStatuses: new_deal, offer_sent, offer_accepted, walkthrough, under_contract, disposition, sold, passed');
    }

    const dealId = args[1];
    const newStatus = args[2];

    const validStatuses = [
      'new_deal', 'offer_sent', 'offer_accepted', 'walkthrough_scheduled',
      'walkthrough_completed', 'under_contract', 'disposition', 
      'end_deposit_collected', 'clear_to_close', 'sold', 'passed'
    ];

    if (!validStatuses.includes(newStatus)) {
      return message.reply(`❌ Invalid status. Valid options: ${validStatuses.join(', ')}`);
    }

    try {
      const deal = await Deal.findOne({ dealId: dealId });
      
      if (!deal) {
        return message.reply('❌ Deal not found.');
      }

      const oldStatus = deal.status;
      deal.status = newStatus;
      deal.activityLog.push({
        action: 'status_update',
        description: `Status changed from ${oldStatus} to ${newStatus}`,
        userId: message.author.id
      });

      await deal.save();

      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🔄 Deal Status Updated')
        .setDescription(`**Deal ID:** ${dealId}\n**Address:** ${deal.address}`)
        .addFields(
          { name: 'Previous Status', value: oldStatus.replace('_', ' ').toUpperCase(), inline: true },
          { name: 'New Status', value: newStatus.replace('_', ' ').toUpperCase(), inline: true }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Update error:', error);
      await message.reply('❌ Failed to update deal status.');
    }
  }

  // Handle pipeline command
  async handlePipelineCommand(message) {
    try {
      const deals = await Deal.find({ discordUserId: message.author.id })
        .sort({ createdAt: -1 })
        .limit(10);

      if (deals.length === 0) {
        return message.reply('📊 No deals found in your pipeline.');
      }

      const embed = new EmbedBuilder()
        .setColor('#9932CC')
        .setTitle('📊 Your Deal Pipeline')
        .setDescription('Recent deals and their status:')
        .setTimestamp();

      deals.forEach(deal => {
        const statusEmoji = this.getStatusEmoji(deal.status);
        const profit = deal.wholesaleProfit || 0;
        
        embed.addFields({
          name: `${statusEmoji} ${deal.dealId}`,
          value: `**${deal.address}**\nStatus: ${deal.status.replace('_', ' ')}\nProfit: $${profit.toLocaleString()}`,
          inline: true
        });
      });

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Pipeline error:', error);
      await message.reply('❌ Failed to load pipeline.');
    }
  }

  // Handle contract generation
  async handleContractCommand(message, args) {
    if (args.length < 2) {
      return message.reply('❌ Usage: `!contract [deal-id]`');
    }

    const dealId = args[1];

    try {
      const deal = await Deal.findOne({ dealId: dealId });
      
      if (!deal) {
        return message.reply('❌ Deal not found.');
      }

      // Generate contract (this would integrate with a contract generation service)
      const contractData = {
        dealId: deal.dealId,
        address: deal.address,
        offerAmount: deal.offerAmount,
        buyerName: 'BLVCK DLPHN INVESTMENTS',
        sellerName: 'TO BE FILLED',
        generatedDate: new Date()
      };

      deal.contractGenerated = true;
      deal.activityLog.push({
        action: 'contract_generated',
        description: 'Purchase contract generated',
        userId: message.author.id
      });

      await deal.save();

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('📄 Contract Generated')
        .setDescription(`Contract ready for: **${deal.address}**`)
        .addFields(
          { name: 'Deal ID', value: deal.dealId, inline: true },
          { name: 'Offer Amount', value: `$${deal.offerAmount?.toLocaleString() || 'TBD'}`, inline: true },
          { name: 'Status', value: 'Ready to Send', inline: true }
        )
        .setFooter({ text: 'Contract will be sent to your email' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Contract error:', error);
      await message.reply('❌ Failed to generate contract.');
    }
  }

  // Handle help command
  async handleHelpCommand(message) {
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('🏠 BLVCK DLPHN Investment CRM - Commands')
      .setDescription('Complete real estate wholesale automation system')
      .addFields(
        { 
          name: '🔍 Analysis Commands', 
          value: '`!analyze [address]` - Full property analysis\n`!comps [address]` - Get comparable sales\n`!profit [deal-id]` - Profit calculations', 
          inline: false 
        },
        { 
          name: '💰 Deal Commands', 
          value: '`!offer [address] [amount]` - Submit offer\n`!update [deal-id] [status]` - Update deal status\n`!contract [deal-id]` - Generate contract', 
          inline: false 
        },
        { 
          name: '📊 Pipeline Commands', 
          value: '`!pipeline` - View your deals\n`!status [deal-id]` - Check deal status', 
          inline: false 
        },
        { 
          name: '🤖 Automation Features', 
          value: '• Auto property analysis\n• AI investment recommendations\n• Profit calculations (Wholesale, Rehab, BRRRR)\n• Contract generation\n• Deal pipeline tracking', 
          inline: false 
        }
      )
      .setFooter({ text: 'BLVCK DLPHN INVESTMENTS - Real Estate Automation' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  // Create analysis embed
  async createAnalysisEmbed(deal, analysis) {
    const embed = new EmbedBuilder()
      .setColor('#9932CC')
      .setTitle('🏠 Property Analysis Complete')
      .setDescription(`**${deal.address}**\n${deal.bedrooms}/${deal.bathrooms} • ${deal.squareFootage?.toLocaleString()} sq ft • Built ${deal.yearBuilt}`)
      .addFields(
        { name: '💰 ARV', value: `$${analysis.analysis?.arv?.toLocaleString() || 'TBD'}`, inline: true },
        { name: '🎯 MAO', value: `$${analysis.analysis?.mao?.toLocaleString() || 'TBD'}`, inline: true },
        { name: '🔨 Rehab', value: `$${analysis.analysis?.rehabCosts?.total?.toLocaleString() || 'TBD'}`, inline: true },
        { name: '📈 Wholesale Profit', value: `$${analysis.analysis?.wholesale?.profit?.toLocaleString() || 'TBD'}`, inline: true },
        { name: '🏗️ Rehab Profit', value: `$${analysis.analysis?.rehab?.netProfit?.toLocaleString() || 'TBD'}`, inline: true },
        { name: '🔄 BRRRR Cash Flow', value: `$${analysis.analysis?.brrrr?.cashFlow?.toLocaleString() || 'TBD'}/mo`, inline: true },
        { name: '🤖 AI Recommendation', value: analysis.aiInsights?.investmentRecommendation || 'Analyzing...', inline: false },
        { name: '📊 Confidence Score', value: `${analysis.aiInsights?.confidenceScore || 5}/10`, inline: true }
      )
      .setFooter({ text: `Deal ID: ${deal.dealId}` })
      .setTimestamp();

    return embed;
  }

  // Handle button interactions
  async handleButtonInteraction(interaction) {
    const [action, dealId] = interaction.customId.split('_');

    try {
      const deal = await Deal.findById(dealId);
      
      if (!deal) {
        return interaction.reply({ content: '❌ Deal not found.', ephemeral: true });
      }

      switch (action) {
        case 'offer':
          await interaction.reply({ 
            content: `💰 To make an offer, use: \`!offer ${deal.address} [amount]\``, 
            ephemeral: true 
          });
          break;
        
        case 'contract':
          await interaction.reply({ 
            content: `📄 To generate contract, use: \`!contract ${deal.dealId}\``, 
            ephemeral: true 
          });
          break;
        
        case 'update':
          await interaction.reply({ 
            content: `🔄 To update status, use: \`!update ${deal.dealId} [status]\``, 
            ephemeral: true 
          });
          break;
      }
    } catch (error) {
      console.error('Button interaction error:', error);
      await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
    }
  }

  // Utility functions
  isAddress(text) {
    // Simple address detection - could be improved
    const addressPattern = /\d+\s+[A-Za-z\s]+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place)/i;
    return addressPattern.test(text);
  }

  async handleAddressDetection(message) {
    const address = message.content;
    
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🏠 Address Detected')
      .setDescription(`I detected an address: **${address}**\n\nWould you like me to analyze this property?`)
      .setFooter({ text: 'Use !analyze to get full analysis' });

    await message.reply({ embeds: [embed] });
  }

  getStatusEmoji(status) {
    const emojis = {
      'new_deal': '🆕',
      'offer_sent': '📤',
      'offer_accepted': '✅',
      'walkthrough_scheduled': '📅',
      'walkthrough_completed': '👀',
      'under_contract': '📝',
      'disposition': '🔄',
      'end_deposit_collected': '💰',
      'clear_to_close': '🏁',
      'sold': '🎉',
      'passed': '❌'
    };
    return emojis[status] || '📋';
  }

  start() {
    this.client.login(process.env.DISCORD_BOT_TOKEN);
  }
}

// Start the bot
const bot = new DiscordCRMBot();
bot.start();