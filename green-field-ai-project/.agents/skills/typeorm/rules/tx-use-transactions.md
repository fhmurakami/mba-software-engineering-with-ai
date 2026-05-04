---
title: Query Builder Usage
impact: HIGH
impactDescription: "Essential for complex queries"
tags: query-builder, performance, sql
---

## Query Builder Usage

Query Builder is one of the most powerful features of TypeORM, allowing you to build complex SQL queries using a fluent interface. Use it for joins, aggregations, and performance-critical lookups.

**Correct (Complex Query with Joins and Ordering):**

```typescript
const users = await userRepository
  .createQueryBuilder("user")
  .leftJoinAndSelect("user.posts", "post")
  .where("user.isActive = :isActive", { isActive: true })
  .andWhere("post.publishedAt IS NOT NULL")
  .orderBy("user.createdAt", "DESC")
  .skip(0)
  .take(10)
  .getMany();

// Aggregation example
const result = await userRepository
  .createQueryBuilder("user")
  .select("COUNT(*)", "count")
  .where("user.isActive = :isActive", { isActive: true })
  .getRawOne();
```
