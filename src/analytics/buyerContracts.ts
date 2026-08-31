/**
 * ChoreScore V2 — Buyer Contracts Service
 *
 * Manages contracts with data product buyers.
 * Each contract explicitly prohibits re-identification and
 * unauthorized redistribution of data products.
 */

import { BuyerContract, DataProcessingPurpose, Jurisdiction } from './types';

/**
 * BuyerContractsService — manages buyer contracts and validates compliance.
 */
export class BuyerContractsService {
  private contracts: Map<string, BuyerContract> = new Map();
  private counter = 0;

  /**
   * Create a new buyer contract.
   */
  createContract(data: {
    buyerName: string;
    buyerType: BuyerContract['buyerType'];
    productIds: string[];
    permittedPurposes: DataProcessingPurpose[];
    buyerJurisdiction: Jurisdiction;
    endDate?: string | null;
  }): BuyerContract {
    this.counter++;
    const contract: BuyerContract = {
      contractId: `bc-${Date.now()}-${this.counter}`,
      buyerName: data.buyerName,
      buyerType: data.buyerType,
      productIds: data.productIds,
      permittedPurposes: data.permittedPurposes,
      buyerJurisdiction: data.buyerJurisdiction,
      reIdentificationProhibited: true, // ALWAYS true
      redistributionProhibited: true, // ALWAYS true
      commercialUseProhibited: true, // ALWAYS true for research data
      startDate: new Date().toISOString(),
      endDate: data.endDate ?? null,
      auditRightsGranted: true,
      reIdentificationReportingRequired: true,
    };

    this.contracts.set(contract.contractId, contract);
    return contract;
  }

  /**
   * Get a contract by ID.
   */
  getContract(contractId: string): BuyerContract | undefined {
    return this.contracts.get(contractId);
  }

  /**
   * Get all contracts for a buyer.
   */
  getBuyerContracts(buyerName: string): BuyerContract[] {
    return Array.from(this.contracts.values()).filter(
      c => c.buyerName === buyerName
    );
  }

  /**
   * Get all active (non-expired) contracts.
   */
  getActiveContracts(): BuyerContract[] {
    const now = Date.now();
    return Array.from(this.contracts.values()).filter(c => {
      if (!c.endDate) return true; // Indefinite
      return new Date(c.endDate).getTime() > now;
    });
  }

  /**
   * Validate that a contract allows a specific purpose.
   */
  isPurposePermitted(contractId: string, purpose: DataProcessingPurpose): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;
    return contract.permittedPurposes.includes(purpose);
  }

  /**
   * Validate that re-identification is prohibited (always true).
   */
  isReIdentificationProhibited(contractId: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return true; // Default: prohibited
    return contract.reIdentificationProhibited;
  }

  /**
   * Validate that redistribution is prohibited (always true).
   */
  isRedistributionProhibited(contractId: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return true; // Default: prohibited
    return contract.redistributionProhibited;
  }

  /**
   * Revoke/terminate a contract.
   */
  revokeContract(contractId: string): void {
    const contract = this.contracts.get(contractId);
    if (contract) {
      contract.endDate = new Date().toISOString();
      this.contracts.set(contractId, contract);
    }
  }

  /**
   * Get contracts that cover a specific product.
   */
  getContractsForProduct(productId: string): BuyerContract[] {
    return Array.from(this.contracts.values()).filter(
      c => c.productIds.includes(productId)
    );
  }
}

/**
 * Create a default buyer contracts service.
 */
export function createDefaultBuyerContracts(): BuyerContractsService {
  return new BuyerContractsService();
}
