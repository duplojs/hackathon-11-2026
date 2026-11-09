import { type ChannelType } from "../../AST/type/channel";
import { createNodePrinter } from "../createNodePrinter";

export const printChannelType = createNodePrinter<ChannelType>(
	(node, context) => {
		const prefix = {
			bidirectional: "chan",
			send: "chan<-",
			receive: "<-chan",
		}[node.direction];
		// Les parenthèses empêchent chan (<-chan T) de devenir chan<- chan T.
		return `${prefix} (${context.renderNode(node.elementType)})`;
	},
);
