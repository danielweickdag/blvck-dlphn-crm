const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = require('docx');
const fs = require('fs').promises;
const path = require('path');

class ContractGeneratorService {
  constructor() {
    this.contractsDir = path.join(__dirname, '../contracts');
    this.ensureContractsDirectory();
  }

  async ensureContractsDirectory() {
    try {
      await fs.mkdir(this.contractsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating contracts directory:', error);
    }
  }

  // Generate purchase contract
  async generatePurchaseContract(dealData) {
    try {
      const {
        dealId,
        address,
        city,
        state,
        zipCode,
        offerAmount,
        earnestMoney = 1000,
        closingDate = this.getDefaultClosingDate(),
        inspectionPeriod = 10,
        buyerName = 'BLVCK DLPHN INVESTMENTS LLC',
        buyerAddress = '123 Investment Blvd, Real Estate City, ST 12345',
        sellerName = 'SELLER NAME TO BE FILLED',
        sellerAddress = 'SELLER ADDRESS TO BE FILLED'
      } = dealData;

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "REAL ESTATE PURCHASE CONTRACT",
                  bold: true,
                  size: 32,
                }),
              ],
              alignment: "center",
              spacing: { after: 400 }
            }),

            // Deal Information
            new Paragraph({
              children: [
                new TextRun({
                  text: `Deal ID: ${dealId}`,
                  bold: true,
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Date: ${new Date().toLocaleDateString()}`,
                  bold: true,
                }),
              ],
              spacing: { after: 400 }
            }),

            // Property Information Section
            new Paragraph({
              children: [
                new TextRun({
                  text: "PROPERTY INFORMATION",
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Property Address: ${address}, ${city}, ${state} ${zipCode}`,
                }),
              ],
              spacing: { after: 200 }
            }),

            // Parties Section
            new Paragraph({
              children: [
                new TextRun({
                  text: "PARTIES",
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 200, before: 400 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "BUYER:",
                  bold: true,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: buyerName,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: buyerAddress,
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "SELLER:",
                  bold: true,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: sellerName,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: sellerAddress,
                }),
              ],
              spacing: { after: 400 }
            }),

            // Purchase Terms Section
            new Paragraph({
              children: [
                new TextRun({
                  text: "PURCHASE TERMS",
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Purchase Price: $${offerAmount?.toLocaleString() || '_____________'}`,
                  bold: true,
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Earnest Money: $${earnestMoney.toLocaleString()}`,
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Closing Date: ${closingDate}`,
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Inspection Period: ${inspectionPeriod} days`,
                }),
              ],
              spacing: { after: 400 }
            }),

            // Contract Terms
            new Paragraph({
              children: [
                new TextRun({
                  text: "CONTRACT TERMS AND CONDITIONS",
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "1. PROPERTY CONDITION:",
                  bold: true,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "Property is being sold in 'AS-IS' condition. Buyer acknowledges that they have inspected the property or waived their right to inspect.",
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "2. FINANCING:",
                  bold: true,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "This is a CASH purchase. No financing contingency applies.",
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "3. TITLE:",
                  bold: true,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "Seller will provide clear and marketable title, free of liens and encumbrances except those specifically accepted by Buyer.",
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "4. ASSIGNMENT:",
                  bold: true,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "Buyer reserves the right to assign this contract to another party with written notice to Seller.",
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "5. INSPECTION PERIOD:",
                  bold: true,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Buyer has ${inspectionPeriod} days from contract acceptance to complete all inspections and due diligence. Buyer may terminate this contract for any reason during this period.`,
                }),
              ],
              spacing: { after: 400 }
            }),

            // Signatures Section
            new Paragraph({
              children: [
                new TextRun({
                  text: "SIGNATURES",
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 200, before: 400 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "BUYER:",
                  bold: true,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "_________________________________    Date: ___________",
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: buyerName,
                }),
              ],
              spacing: { after: 400 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "SELLER:",
                  bold: true,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "_________________________________    Date: ___________",
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: sellerName,
                }),
              ],
              spacing: { after: 200 }
            }),

            // Footer
            new Paragraph({
              children: [
                new TextRun({
                  text: "Generated by BLVCK DLPHN INVESTMENT CRM",
                  italics: true,
                  size: 18,
                }),
              ],
              alignment: "center",
              spacing: { before: 400 }
            }),
          ],
        }],
      });

      // Generate filename
      const filename = `contract_${dealId}_${Date.now()}.docx`;
      const filepath = path.join(this.contractsDir, filename);

      // Save document
      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(filepath, buffer);

      return {
        filename,
        filepath,
        contractData: {
          dealId,
          address: `${address}, ${city}, ${state} ${zipCode}`,
          purchasePrice: offerAmount,
          earnestMoney,
          closingDate,
          inspectionPeriod,
          buyerName,
          sellerName,
          generatedDate: new Date(),
          contractPath: filepath
        }
      };

    } catch (error) {
      console.error('Contract generation error:', error);
      throw new Error(`Failed to generate contract: ${error.message}`);
    }
  }

  // Generate assignment contract
  async generateAssignmentContract(dealData, assigneeData) {
    try {
      const {
        dealId,
        address,
        city,
        state,
        zipCode,
        originalPurchasePrice,
        assignmentFee,
        assignorName = 'BLVCK DLPHN INVESTMENTS LLC',
        assigneeName,
        assigneeAddress
      } = { ...dealData, ...assigneeData };

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "ASSIGNMENT OF REAL ESTATE PURCHASE CONTRACT",
                  bold: true,
                  size: 32,
                }),
              ],
              alignment: "center",
              spacing: { after: 400 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Deal ID: ${dealId}`,
                  bold: true,
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Date: ${new Date().toLocaleDateString()}`,
                  bold: true,
                }),
              ],
              spacing: { after: 400 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Property: ${address}, ${city}, ${state} ${zipCode}`,
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Original Purchase Price: $${originalPurchasePrice?.toLocaleString()}`,
                }),
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Assignment Fee: $${assignmentFee?.toLocaleString()}`,
                  bold: true,
                }),
              ],
              spacing: { after: 400 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `${assignorName} hereby assigns all rights, title, and interest in the above-referenced purchase contract to ${assigneeName} for the assignment fee stated above.`,
                }),
              ],
              spacing: { after: 400 }
            }),

            // Signatures
            new Paragraph({
              children: [
                new TextRun({
                  text: "ASSIGNOR:",
                  bold: true,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "_________________________________    Date: ___________",
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: assignorName,
                }),
              ],
              spacing: { after: 400 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "ASSIGNEE:",
                  bold: true,
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "_________________________________    Date: ___________",
                }),
              ],
              spacing: { after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: assigneeName,
                }),
              ],
              spacing: { after: 200 }
            }),
          ],
        }],
      });

      const filename = `assignment_${dealId}_${Date.now()}.docx`;
      const filepath = path.join(this.contractsDir, filename);

      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(filepath, buffer);

      return {
        filename,
        filepath,
        assignmentData: {
          dealId,
          assignmentFee,
          assignorName,
          assigneeName,
          generatedDate: new Date()
        }
      };

    } catch (error) {
      console.error('Assignment contract generation error:', error);
      throw new Error(`Failed to generate assignment contract: ${error.message}`);
    }
  }

  // Get default closing date (30 days from now)
  getDefaultClosingDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString();
  }

  // Get contract by filename
  async getContract(filename) {
    try {
      const filepath = path.join(this.contractsDir, filename);
      const buffer = await fs.readFile(filepath);
      return buffer;
    } catch (error) {
      throw new Error(`Contract not found: ${filename}`);
    }
  }

  // List all contracts
  async listContracts() {
    try {
      const files = await fs.readdir(this.contractsDir);
      const contracts = [];

      for (const file of files) {
        if (file.endsWith('.docx')) {
          const filepath = path.join(this.contractsDir, file);
          const stats = await fs.stat(filepath);
          contracts.push({
            filename: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          });
        }
      }

      return contracts.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('Error listing contracts:', error);
      return [];
    }
  }

  // Delete contract
  async deleteContract(filename) {
    try {
      const filepath = path.join(this.contractsDir, filename);
      await fs.unlink(filepath);
      return true;
    } catch (error) {
      console.error('Error deleting contract:', error);
      return false;
    }
  }
}

module.exports = new ContractGeneratorService();