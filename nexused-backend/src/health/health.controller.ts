import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Health check controller for readiness probes.
 *
 * Used by CI to verify the server is ready before running E2E tests.
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
