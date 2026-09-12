import { ChevronRight, Stethoscope } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Modal } from './ui'

/**
 * 智能问疾：放在「分类指南」六个按钮下面
 * 第一版只做入口 + 说明，不接真实模型（本地词库检索 0 token）
 */
export function SmartDiagnose({ style }: { style?: CSSProperties }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="cta-big" style={style} onClick={() => setOpen(true)}>
        <span className="cta-big__icon">
          <Stethoscope size={23} strokeWidth={1.75} />
        </span>
        <span className="cta-big__body">
          <span className="cta-big__title">智能问疾</span>
          <span className="cta-big__sub">描述症状，先做一次初步筛查和建议</span>
        </span>
        <span className="cta-big__arrow">
          <ChevronRight size={18} strokeWidth={2} />
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="智能问疾">
        <div className="ai-note">
          <div className="ai-note__row">
            <span>🚧</span>
            <span>这个功能还在规划中，第一版先放个入口。</span>
          </div>
        </div>

        <div className="fs-13 text-2" style={{ lineHeight: 1.9 }}>
          上线后它会做这些事：
          <br />
          1. 你描述症状（如「不吃东西、肚子有点硬」）
          <br />
          2. 先在本机知识库里检索，给出可能原因和护理建议
          <br />
          3. 判断是否属于「必须尽快就医」的危险信号
          <br />
          4. 全程提示：这只是健康参考，不能替代兽医诊断
        </div>

        <div className="divider" />

        <div className="fs-12 text-3" style={{ lineHeight: 1.9 }}>
          技术说明：如果只用本机数据库做关键词检索，完全不消耗 token、不联网、不花钱；只有接入云端大模型做自由问答时，才会产生 token 费用。
        </div>

        <div className="divider" />

        <div className="fs-12 text-3" style={{ lineHeight: 1.9 }}>
          合规说明：改名可以让它不像"医疗诊断"，但资质问题不由名字决定。
          <br />
          · 功能上只做「科普 + 症状自查 + 引导就医」，不出现确诊、开药、治疗方案等表述
          <br />
          · 必须显著标注「仅供参考，不能替代兽医诊断」
          <br />
          · 将来上小程序，宠物医疗类内容多数平台要求企业主体，涉及问诊还可能要求相关资质
        </div>

        <div className="modal__actions">
          <button className="btn btn--primary btn--block" onClick={() => setOpen(false)}>
            知道了
          </button>
        </div>
      </Modal>
    </>
  )
}
