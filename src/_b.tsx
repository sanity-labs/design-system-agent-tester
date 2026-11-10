import { Badge, Text, Flex, VStack, Card } from '@sanity/ui'
import { CheckmarkIcon } from '@sanity/icons/Checkmark'
export const Rows = () => (
  <Flex gap={2}>
    <Badge tone="positive" iconStart={CheckmarkIcon}>Published</Badge>
    <Badge>Draft</Badge>
  </Flex>
)
