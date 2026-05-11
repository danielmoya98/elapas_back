import { Module } from '@nestjs/common';

import { CacheModule } from '@nestjs/cache-manager';

import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,

      useFactory: async () => ({
        store: redisStore,

        host:
          process.env.REDIS_HOST,

        port: Number(
          process.env.REDIS_PORT,
        ),

        ttl: 60,
      }),
    }),
  ],
})
export class RedisModule { }
