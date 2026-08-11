/**
 * Multi-joint / multi-constraint solving
 * --------------------------------------
 * Today's compose path (`attachAt`) is closed-form: one attach joint + one
 * part scale. No solver needed; keep that path tiny.
 *
 * When you outgrow that (e.g. "hands meet AND height is 72in AND head scale
 * is free"), use a real linear constraint solver instead of hand-rolled math.
 *
 * We depend on `@lume/kiwi` (Cassowary). Typical pattern:
 *
 *   const solver = new Solver();
 *   const headScale = new Variable();
 *   const heightPx = new Variable();
 *   solver.addConstraint(new Constraint(
 *     new Expression([-1, heightPx], [72 * ppi]), // example
 *     Operator.Eq,
 *   ));
 *   solver.updateVariables();
 *
 * This module re-exports kiwi so apps don't take a second dependency, and
 * leaves room for thin helpers as real use-cases appear. Do not put simple
 * attach/scale through the solver; that only adds code.
 */

export {
  Solver,
  Variable,
  Expression,
  Constraint,
  Operator,
  Strength,
} from "@lume/kiwi";
