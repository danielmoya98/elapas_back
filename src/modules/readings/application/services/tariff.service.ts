import { Injectable } from '@nestjs/common';

@Injectable()
export class TariffService {
  calculate(
    category: string,
    consumption: number,
  ) {
    let fixedCharge = 0;

    let unitPrice = 0;

    let penaltyAmount = 0;

    let subtotal = 0;

    switch (category) {
      case 'SOLIDARIA':
        unitPrice = 5.7;
        subtotal = consumption * unitPrice;
        break;

      case 'DOMESTICA':
        unitPrice = 8.64;
        subtotal = consumption * unitPrice;
        break;

      case 'COMERCIAL':
        fixedCharge = 88;
        unitPrice = 18;

        subtotal =
          fixedCharge +
          consumption * unitPrice;

        break;

      case 'CONDOMINIO':
        unitPrice = 6.8;
        subtotal = consumption * unitPrice;
        break;

      default:
        unitPrice = 8.64;
        subtotal = consumption * unitPrice;
    }

    if (consumption > 100) {
      penaltyAmount = subtotal * 0.15;
    }

    const total =
      subtotal + penaltyAmount;

    return {
      consumption,

      fixedCharge,

      unitPrice,

      penaltyAmount,

      subtotal,

      total,
    };
  }
}
